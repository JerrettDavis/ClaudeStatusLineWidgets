import {
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  openSync,
  readSync,
  closeSync,
  copyFileSync,
  readFileSync,
} from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { readUsageCache } from "./usage.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WindowTokens {
  /** Regular (non-cached) input tokens */
  input: number;
  /** Output tokens */
  output: number;
  /** Cache-read input tokens */
  cacheReads: number;
  /** Cache-creation tokens for the 5-minute tier */
  cacheWrites5m: number;
  /** Cache-creation tokens for the 1-hour tier */
  cacheWrites1h: number;
  /** Total cache-creation tokens (sum of both tiers) */
  cacheWritesTotal: number;
}

export interface WindowRecord {
  /** ISO timestamp of the window start */
  start: string;
  /** ISO timestamp of the window end */
  end: string;
  tokens: WindowTokens;
  /** Per-model token breakdown within this window */
  byModel: Record<string, WindowTokens>;
  /**
   * Proportionally-weighted token equivalent (Sonnet-normalised).
   *
   * Each model's total tokens (input + output + cache reads + cache writes) are
   * multiplied by a family weight, then summed.  Unattributed tokens (entries
   * without a model field) are included at the default weight (1.0).
   *
   * This value lets you correlate transcript token spend against the API
   * utilisation percentage to back-calculate the effective window capacity.
   */
  weightedTokenEquivalent: number;
  /**
   * The weight applied per model ID when computing `weightedTokenEquivalent`.
   * Stored so historical records can be re-analysed with revised weights.
   */
  modelWeights: Record<string, number>;
}

/** Snapshot of API-reported utilisation percentages and overage at poll time */
export interface ApiStats {
  /** 5-hour rate-limit utilisation (0–100), or null if unavailable */
  five_hour_pct: number | null;
  /** 7-day rate-limit utilisation (0–100), or null if unavailable */
  seven_day_pct: number | null;
  /** Overage credits consumed in USD, or null if overage is disabled */
  overage_used_usd: number | null;
  /** Overage monthly cap in USD, or null if no cap is set */
  overage_limit_usd: number | null;
  /** Overage utilisation (0–100), or null if unavailable */
  overage_pct: number | null;
}

export interface TrackingRecord {
  /** ISO timestamp when this record was produced */
  polledAt: string;
  /** API-reported utilisation and overage stats at poll time */
  apiStats: ApiStats;
  windows: {
    five_hour?: WindowRecord;
    seven_day?: WindowRecord;
    seven_day_opus?: WindowRecord;
    seven_day_sonnet?: WindowRecord;
  };
}

// ---------------------------------------------------------------------------
// Internal transcript-entry shape
// ---------------------------------------------------------------------------

interface TranscriptUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation?: {
    ephemeral_5m_input_tokens?: number;
    ephemeral_1h_input_tokens?: number;
  };
}

interface TranscriptEntry {
  timestamp?: string;
  message?: {
    model?: string;
    usage?: TranscriptUsage;
  };
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export function getTrackingDir(): string {
  const configDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
  return join(configDir, ".session-tracking");
}

function getDataFile(): string {
  return join(getTrackingDir(), "data.jsonl");
}

function getLockFile(): string {
  return join(getTrackingDir(), ".lock");
}

function getBackupsDir(): string {
  return join(getTrackingDir(), "backups");
}

// ---------------------------------------------------------------------------
// Stale check — one poll per minute globally
// ---------------------------------------------------------------------------

/** Minimum time between polls. A new poll is skipped if one ran within this window. */
const POLL_INTERVAL_MS = 60_000; // 1 minute

function isStale(): boolean {
  try {
    return Date.now() - statSync(getDataFile()).mtimeMs > POLL_INTERVAL_MS;
  } catch {
    return true; // data file doesn't exist yet
  }
}

// ---------------------------------------------------------------------------
// File-based lock (prevents duplicate polls across concurrent sessions)
// ---------------------------------------------------------------------------

interface LockData {
  pid: number;
  lockedAt: number;
}

const LOCK_STALE_MS = 2 * 60_000; // 2 minutes — treat older locks as stale/crashed

function acquireLock(): boolean {
  const lockFile = getLockFile();
  try {
    const raw = readFileSync(lockFile, "utf-8");
    const lock: LockData = JSON.parse(raw);
    if (Date.now() - lock.lockedAt < LOCK_STALE_MS) {
      return false; // another process holds a fresh lock
    }
  } catch {
    // No lock file or parse error — proceed to acquire
  }
  // Write our lock. The write happens inside a check-then-act window so in
  // theory two processes can both pass the freshness check and both write.
  // This is benign: at worst two processes poll simultaneously once, producing
  // two adjacent records (both valid data).  The file-append itself is only
  // performed while the lock is held (inside performSessionTracking's
  // try/finally), so individual JSONL records are always written atomically.
  try {
    writeFileSync(lockFile, JSON.stringify({ pid: process.pid, lockedAt: Date.now() }), "utf-8");
    return true;
  } catch {
    return false;
  }
}

function releaseLock(): void {
  try {
    const lockFile = getLockFile();
    const raw = readFileSync(lockFile, "utf-8");
    const lock: LockData = JSON.parse(raw);
    if (lock.pid === process.pid) {
      writeFileSync(lockFile, JSON.stringify({ pid: 0, lockedAt: 0 }), "utf-8");
    }
  } catch {
    // Non-fatal
  }
}

// ---------------------------------------------------------------------------
// Transcript discovery
// ---------------------------------------------------------------------------

function walkJsonlFiles(dir: string, results: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const full = join(dir, name);
    try {
      const st = statSync(full);
      if (st.isDirectory()) {
        walkJsonlFiles(full, results);
      } else if (name.endsWith(".jsonl")) {
        results.push(full);
      }
    } catch {
      // Skip unreadable entries
    }
  }
}

/**
 * Find all Claude session transcript .jsonl files under ~/.claude/projects.
 */
export function findTranscriptFiles(): string[] {
  const configDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
  const results: string[] = [];
  walkJsonlFiles(join(configDir, "projects"), results);
  return results;
}

// ---------------------------------------------------------------------------
// Transcript reading
// ---------------------------------------------------------------------------

/**
 * Read up to 10 MB from the beginning of a transcript file, returning
 * non-empty lines.
 *
 * NOTE: Transcripts are read from the start so the full window range is
 * covered.  If an individual transcript file exceeds 10 MB, entries near the
 * end of the file will be silently omitted from the aggregation.  This limit
 * is intentionally generous — typical session files are well under 1 MB.
 */
function readTranscriptLines(filePath: string): string[] {
  try {
    const st = statSync(filePath);
    const readSize = Math.min(st.size, 10 * 1024 * 1024); // cap at 10 MB per file
    const buffer = Buffer.alloc(readSize);
    const fd = openSync(filePath, "r");
    readSync(fd, buffer, 0, readSize, 0);
    closeSync(fd);
    return buffer.toString("utf-8").split("\n").filter((l) => l.trim().length > 0);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Token aggregation
// ---------------------------------------------------------------------------

function emptyTokens(): WindowTokens {
  return {
    input: 0,
    output: 0,
    cacheReads: 0,
    cacheWrites5m: 0,
    cacheWrites1h: 0,
    cacheWritesTotal: 0,
  };
}

function addTokens(dest: WindowTokens, u: TranscriptUsage): void {
  dest.input += u.input_tokens ?? 0;
  dest.output += u.output_tokens ?? 0;
  dest.cacheReads += u.cache_read_input_tokens ?? 0;

  const w5m = u.cache_creation?.ephemeral_5m_input_tokens ?? 0;
  const w1h = u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  const total = u.cache_creation_input_tokens ?? (w5m + w1h);
  dest.cacheWrites5m += w5m;
  dest.cacheWrites1h += w1h;
  dest.cacheWritesTotal += total;
}

// ---------------------------------------------------------------------------
// Model-family weights (Sonnet-normalised)
//
// True weights are not publicly documented; these are empirical estimates
// based on observed rate-limit behaviour.  Ranges:
//   Haiku:   0.1–0.9× (fast/cheap model, lower rate-limit cost)
//   Sonnet:  1.0×      (baseline reference)
//   Opus:    1.1–3.0+× (most capable, higher rate-limit cost)
//
// The weight per model is stored alongside the computed equivalent so that
// historical records can be re-analysed when better estimates are known.
// ---------------------------------------------------------------------------

/** Default (Sonnet-normalised) weights for known Claude model families. */
export const MODEL_FAMILY_WEIGHTS: Record<string, number> = {
  "opus": 2.0,
  "sonnet": 1.0,
  "haiku": 0.5,
};

/** Weight to apply when the model ID is absent or unrecognised. */
export const DEFAULT_MODEL_WEIGHT = 1.0;

/**
 * Derive a Sonnet-normalised weight from a model ID string by matching against
 * known family names using word-boundary patterns (e.g. "claude-opus-4-5"
 * matches "opus" but "super-haiku-opus-variant" correctly resolves to "opus").
 * Falls back to the default weight when no family is recognised.
 */
export function getModelWeight(modelId: string): number {
  const lower = modelId.toLowerCase();
  for (const [family, weight] of Object.entries(MODEL_FAMILY_WEIGHTS)) {
    if (new RegExp(`(?<![a-z])${family}(?![a-z])`).test(lower)) return weight;
  }
  return DEFAULT_MODEL_WEIGHT;
}

/** Sum all token categories for a single model into one scalar. */
function totalTokenCount(t: WindowTokens): number {
  return t.input + t.output + t.cacheReads + t.cacheWritesTotal;
}

export interface WindowData {
  tokens: WindowTokens;
  byModel: Record<string, WindowTokens>;
  /** Sonnet-normalised weighted token equivalent (see WindowRecord docs). */
  weightedTokenEquivalent: number;
  /** Per-model weights used when computing weightedTokenEquivalent. */
  modelWeights: Record<string, number>;
}

/**
 * Scan all transcript files and sum token usage for entries whose timestamp
 * falls within [startMs, endMs). Returns aggregate totals, a per-model
 * breakdown, and a Sonnet-normalised weighted token equivalent.
 */
export function computeWindowData(startMs: number, endMs: number): WindowData {
  const totals = emptyTokens();
  const byModel: Record<string, WindowTokens> = {};
  // Track tokens from entries that had no model attribution separately so we
  // can include them in the weighted total at the default weight.
  const unattributed = emptyTokens();

  for (const filePath of findTranscriptFiles()) {
    for (const line of readTranscriptLines(filePath)) {
      let entry: TranscriptEntry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }
      if (!entry.timestamp) continue;
      const ts = new Date(entry.timestamp).getTime();
      if (isNaN(ts) || ts < startMs || ts >= endMs) continue;

      const u = entry.message?.usage;
      if (!u) continue;

      addTokens(totals, u);

      const modelId = entry.message?.model;
      if (modelId) {
        if (!byModel[modelId]) byModel[modelId] = emptyTokens();
        addTokens(byModel[modelId], u);
      } else {
        addTokens(unattributed, u);
      }
    }
  }

  // Compute weighted token equivalent: sum(model_total * weight) for each
  // known model, plus unattributed tokens at the default weight.
  const modelWeights: Record<string, number> = {};
  let weightedTokenEquivalent = 0;

  for (const [modelId, modelTokens] of Object.entries(byModel)) {
    const weight = getModelWeight(modelId);
    modelWeights[modelId] = weight;
    weightedTokenEquivalent += totalTokenCount(modelTokens) * weight;
  }

  // Unattributed tokens contribute at the default (Sonnet) weight.
  weightedTokenEquivalent += totalTokenCount(unattributed) * DEFAULT_MODEL_WEIGHT;

  return { tokens: totals, byModel, weightedTokenEquivalent, modelWeights };
}

/**
 * @deprecated Use computeWindowData instead.
 * Retained for any external consumers; delegates to computeWindowData.
 */
export function computeWindowTokens(startMs: number, endMs: number): WindowTokens {
  return computeWindowData(startMs, endMs).tokens;
}

// ---------------------------------------------------------------------------
// Persistence — append-only JSONL (data is never deleted)
// ---------------------------------------------------------------------------

function ensureDirs(): void {
  const dir = getTrackingDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const backups = getBackupsDir();
  if (!existsSync(backups)) mkdirSync(backups, { recursive: true });
}

function writeRecordAppend(record: TrackingRecord): void {
  writeFileSync(getDataFile(), JSON.stringify(record) + "\n", { flag: "a", encoding: "utf-8" });
}

// ---------------------------------------------------------------------------
// Daily backups
// ---------------------------------------------------------------------------

/**
 * Copy the current data file to backups/ once per day.
 * Existing backup files are never removed.
 */
function maybeBackup(): void {
  const dataFile = getDataFile();
  if (!existsSync(dataFile)) return;

  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const backupFile = join(getBackupsDir(), `data-${today}.jsonl`);

  if (!existsSync(backupFile)) {
    try {
      copyFileSync(dataFile, backupFile);
    } catch {
      // Non-fatal
    }
    return;
  }

  // Refresh today's backup if it's older than 24 h (e.g. long-running day)
  try {
    if (Date.now() - statSync(backupFile).mtimeMs > 24 * 60 * 60_000) {
      copyFileSync(dataFile, backupFile);
    }
  } catch {
    // Non-fatal
  }
}

// ---------------------------------------------------------------------------
// Window boundary resolution
// ---------------------------------------------------------------------------

const FIVE_HOUR_MS = 5 * 60 * 60_000;
const SEVEN_DAY_MS = 7 * 24 * 60 * 60_000;

/**
 * Resolve [startMs, endMs] for a rate-limit window.
 *
 * When the API provides a `resets_at` timestamp the window is
 * [resets_at − duration, resets_at] (fixed window aligned to the reset).
 * Otherwise a rolling window ending at `nowMs` is used.
 */
function resolveWindow(
  resetsAt: string | null | undefined,
  durationMs: number,
  nowMs: number
): { startMs: number; endMs: number } {
  if (resetsAt) {
    const endMs = new Date(resetsAt).getTime();
    if (!isNaN(endMs)) {
      return { startMs: endMs - durationMs, endMs };
    }
  }
  return { startMs: nowMs - durationMs, endMs: nowMs };
}

function buildWindowRecord(
  resetsAt: string | null | undefined,
  durationMs: number,
  nowMs: number
): WindowRecord {
  const { startMs, endMs } = resolveWindow(resetsAt, durationMs, nowMs);
  const { tokens, byModel, weightedTokenEquivalent, modelWeights } = computeWindowData(startMs, endMs);
  return {
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
    tokens,
    byModel,
    weightedTokenEquivalent,
    modelWeights,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Perform session tracking: compute window tokens from all transcripts and
 * persist the result. Called by the background child process.
 */
export async function performSessionTracking(): Promise<void> {
  ensureDirs();

  if (!acquireLock()) return; // another process is already polling

  try {
    const nowMs = Date.now();
    const nowISO = new Date(nowMs).toISOString();

    // Use the cached usage data for exact API window boundaries when available
    const usageData = readUsageCache()?.data ?? null;

    // Build API stats snapshot from cached usage data
    const apiStats: ApiStats = {
      five_hour_pct: usageData?.five_hour?.utilization ?? null,
      seven_day_pct: usageData?.seven_day?.utilization ?? null,
      overage_used_usd:
        usageData?.extra_usage?.used_credits != null
          ? usageData.extra_usage.used_credits / 100
          : null,
      overage_limit_usd:
        usageData?.extra_usage?.monthly_limit != null
          ? usageData.extra_usage.monthly_limit / 100
          : null,
      overage_pct: usageData?.extra_usage?.utilization ?? null,
    };

    const record: TrackingRecord = { polledAt: nowISO, apiStats, windows: {} };

    // Five-hour window (always computed)
    record.windows.five_hour = buildWindowRecord(
      usageData?.five_hour?.resets_at,
      FIVE_HOUR_MS,
      nowMs
    );

    // Seven-day window (always computed)
    record.windows.seven_day = buildWindowRecord(
      usageData?.seven_day?.resets_at,
      SEVEN_DAY_MS,
      nowMs
    );

    // Per-model 7-day windows (only when the API surface includes them)
    if (usageData?.seven_day_opus) {
      record.windows.seven_day_opus = buildWindowRecord(
        usageData.seven_day_opus.resets_at,
        SEVEN_DAY_MS,
        nowMs
      );
    }

    if (usageData?.seven_day_sonnet) {
      record.windows.seven_day_sonnet = buildWindowRecord(
        usageData.seven_day_sonnet.resets_at,
        SEVEN_DAY_MS,
        nowMs
      );
    }

    writeRecordAppend(record);
    maybeBackup();
  } finally {
    releaseLock();
  }
}

/**
 * Spawn a fully-detached background process to perform session tracking.
 * Returns immediately; the main render path is never blocked.
 */
export function triggerSessionTracking(): void {
  if (!isStale()) return;

  const child = spawn(
    process.execPath,
    [join(__dirname, "index.js"), "--track-sessions"],
    {
      detached: true,
      stdio: "ignore",
      env: { ...process.env, _STATUSLINE_BG: "1" },
    }
  );
  child.unref();
}
