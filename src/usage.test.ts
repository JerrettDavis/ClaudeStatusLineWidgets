import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { decodeCredentialPayload, isCacheStale } from "./usage.js";

const CREDS = { claudeAiOauth: { accessToken: "sk-test-token", expiresAt: 1234567890 } };
const CREDS_JSON = JSON.stringify(CREDS);
const CREDS_HEX = Buffer.from(CREDS_JSON, "utf-8").toString("hex");

describe("decodeCredentialPayload", () => {
  it("passes plain JSON through unchanged", () => {
    // Regression: Buffer.from(json, "hex") stops at the leading "{" and
    // returns an empty buffer, which made every usage widget render nothing
    // on macOS because JSON.parse("") threw into a silent catch.
    expect(decodeCredentialPayload(CREDS_JSON)).toBe(CREDS_JSON);
    expect(JSON.parse(decodeCredentialPayload(CREDS_JSON))).toEqual(CREDS);
  });

  it("decodes a hex-encoded payload", () => {
    expect(decodeCredentialPayload(CREDS_HEX)).toBe(CREDS_JSON);
    expect(JSON.parse(decodeCredentialPayload(CREDS_HEX))).toEqual(CREDS);
  });

  it("treats odd-length hex-looking input as plain text", () => {
    // "abc" is hex-alphabet but cannot be a valid byte sequence.
    expect(decodeCredentialPayload("abc")).toBe("abc");
  });

  it("returns an empty string unchanged", () => {
    expect(decodeCredentialPayload("")).toBe("");
  });
});

describe("isCacheStale", () => {
  let configDir: string;
  const prevConfigDir = process.env.CLAUDE_CONFIG_DIR;

  beforeAll(() => {
    configDir = mkdtempSync(join(tmpdir(), "statusline-usage-test-"));
    process.env.CLAUDE_CONFIG_DIR = configDir;
  });

  afterAll(() => {
    if (prevConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR;
    else process.env.CLAUDE_CONFIG_DIR = prevConfigDir;
    rmSync(configDir, { recursive: true, force: true });
  });

  /** Write a JSON file whose mtime is `ageMs` in the past. */
  function writeAged(file: string, data: unknown, ageMs: number): void {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(data), "utf-8");
    const t = (Date.now() - ageMs) / 1000;
    utimesSync(file, t, t);
  }

  const writeCache = (ageMs: number, rateLimitedUntil?: number) =>
    writeAged(join(configDir, ".cache", "usage.json"),
      { fetchedAt: Date.now() - ageMs, data: {}, rateLimitedUntil }, ageMs);
  const writeCredentials = (ageMs: number) =>
    writeAged(join(configDir, ".credentials.json"), CREDS, ageMs);

  it("keeps a fresh cache written after the current login", () => {
    writeCredentials(60 * 60_000);
    writeCache(10_000);
    expect(isCacheStale()).toBe(false);
  });

  it("refetches a fresh cache when the credentials changed after it (account switch)", () => {
    // Regression: after `/login` or a claude-swap account switch, the previous
    // account's usage stayed on screen until the 60s threshold elapsed.
    writeCache(10_000);
    writeCredentials(1_000);
    expect(isCacheStale()).toBe(true);
  });

  it("respects a rate-limit backoff for the same login", () => {
    writeCredentials(60 * 60_000);
    writeCache(10 * 60_000, Date.now() + 5 * 60_000);
    expect(isCacheStale()).toBe(false);
  });

  it("ignores the previous account's rate-limit backoff after an account switch", () => {
    writeCache(10 * 60_000, Date.now() + 5 * 60_000);
    writeCredentials(1_000);
    expect(isCacheStale()).toBe(true);
  });
});
