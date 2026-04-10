import React, { useState, useEffect } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { loadSettings, saveSettings } from "../config/loader.js";
import { createDefaultSettings, generateId } from "../config/schema.js";
import type { Settings, WidgetItemConfig } from "../config/schema.js";
import { renderStatusLine } from "../renderer.js";
import type { RenderContext } from "../widgets/types.js";
import { MainMenu } from "./components/MainMenu.js";
import { LineSelector } from "./components/LineSelector.js";
import { ItemsEditor } from "./components/ItemsEditor.js";
import { WidgetPicker } from "./components/WidgetPicker.js";
import { ColorMenu } from "./components/ColorMenu.js";

type Screen = "main" | "lines" | "items" | "picker" | "colors";

export function App() {
  const { exit } = useApp();
  const [settings, setSettings] = useState<Settings>(createDefaultSettings);
  const [screen, setScreen] = useState<Screen>("main");
  const [editingLine, setEditingLine] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  // Global keys
  useInput((input, key) => {
    if (key.ctrl && input === "s") {
      try {
        saveSettings(settings);
        setHasChanges(false);
        setFlash("Saved!");
      } catch {
        setFlash("Save failed");
      }
      setTimeout(() => setFlash(null), 2000);
    }
  });

  const updateSettings = (next: Settings) => {
    setSettings(next);
    setHasChanges(true);
  };

  const createWidgetItem = (type: string): WidgetItemConfig => {
    if (type === "custom-text") {
      return { id: generateId(), type, customText: "custom text" };
    }
    if (type === "custom-symbol") {
      return { id: generateId(), type, customText: "•" };
    }
    if (type === "link") {
      return {
        id: generateId(),
        type,
        customText: "docs",
        options: { url: "https://example.com" },
      };
    }
    if (type === "custom-command") {
      return {
        id: generateId(),
        type,
        options: { command: "echo configure-me", timeoutMs: 1000 },
      };
    }
    return { id: generateId(), type };
  };

  const handleSaveAndExit = () => {
    try {
      saveSettings(settings);
      exit();
    } catch {
      setFlash("Save failed");
      setTimeout(() => setFlash(null), 2000);
    }
  };

  const handleExit = () => {
    exit();
  };

  // Build preview context
  const previewCtx: RenderContext = {
    payload: {},
    cacheTTL: { remainingSeconds: -1, tier: "none", lastWriteTime: null, expiresAt: null, cacheReadActive: false },
    cacheStats: { totalReads: 0, totalWrites: 0, breakCount: 0, lastBreakTime: null, lastBreakTokens: 0, avgBreakTokens: 0 },
    usageData: null,
    headroomStats: null,
    runtime: {
      git: {
        available: true,
        cwd: "C:\\git\\my-app",
        branch: "main",
        rootPath: "C:\\git\\my-app",
        rootName: "my-app",
        sha: "a1b2c3d",
        staged: 2,
        unstaged: 1,
        untracked: 0,
        conflicts: 0,
        changes: 3,
        insertions: 42,
        deletions: 10,
        ahead: 1,
        behind: 0,
        origin: { rawUrl: "git@github.com:owner/repo.git", owner: "owner", repo: "repo" },
        upstream: { rawUrl: "git@github.com:upstream/repo.git", owner: "upstream", repo: "repo" },
        isFork: true,
        worktreeMode: "linked",
        worktreeName: "my-app",
        worktreeBranch: "main",
        worktreeOriginalBranch: "main",
      },
      session: {
        sessionId: "abc123",
        version: "1.0.22",
        outputStyle: "default",
        vimMode: "insert",
        thinkingEffort: "high",
        skills: ["brainstorming"],
        accountEmail: "me@example.com",
        startedAt: new Date(Date.now() - 45 * 60_000).toISOString(),
        elapsedSeconds: 45 * 60,
      },
      system: {
        terminalWidth: 132,
        memoryUsedBytes: 8 * 1024 ** 3,
        memoryTotalBytes: 32 * 1024 ** 3,
      },
      tokens: {
        input: 18200,
        output: 2400,
        cached: 12000,
        total: 32600,
        inputSpeed: 12,
        outputSpeed: 2,
        totalSpeed: 14,
      },
      usage: {
        fiveHourResetSeconds: 67 * 60,
        sevenDayResetSeconds: 3 * 24 * 3600,
      },
    },
    displayMode: settings.minimalistMode ? "minimal" : "normal",
    isPreview: true,
  };

  const previewOutput = renderStatusLine(settings, previewCtx);

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">Claude StatusLine Widgets</Text>
        <Text> </Text>
        {hasChanges && <Text color="yellow">[unsaved]</Text>}
        {flash && <Text color="green"> {flash}</Text>}
      </Box>

      {/* Preview */}
      <Box flexDirection="column" marginBottom={1} borderStyle="round" borderColor="gray" paddingX={1}>
        <Text dimColor>Preview:</Text>
        {previewOutput.split("\n").map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>

      {/* Screen router */}
      {screen === "main" && (
        <MainMenu
          minimalistMode={settings.minimalistMode}
          onSelect={(action) => {
            if (action === "lines") setScreen("lines");
            else if (action === "colors") setScreen("colors");
            else if (action === "minimal") {
              updateSettings({ ...settings, minimalistMode: !settings.minimalistMode });
            }
            else if (action === "save") handleSaveAndExit();
            else if (action === "exit") handleExit();
            else if (action === "reset") {
              updateSettings(createDefaultSettings());
              setFlash("Reset to defaults");
              setTimeout(() => setFlash(null), 2000);
            }
          }}
        />
      )}

      {screen === "lines" && (
        <LineSelector
          settings={settings}
          onSelectLine={(idx) => {
            setEditingLine(idx);
            setScreen("items");
          }}
          onAddLine={() => {
            updateSettings({ ...settings, lines: [...settings.lines, []] });
          }}
          onBack={() => setScreen("main")}
        />
      )}

      {screen === "items" && (
        <ItemsEditor
          line={settings.lines[editingLine] ?? []}
          lineIndex={editingLine}
          onChange={(newLine) => {
            const newLines = [...settings.lines];
            newLines[editingLine] = newLine;
            updateSettings({ ...settings, lines: newLines });
          }}
          onAddWidget={() => setScreen("picker")}
          onDeleteLine={() => {
            const newLines = settings.lines.filter((_, i) => i !== editingLine);
            updateSettings({ ...settings, lines: newLines.length > 0 ? newLines : [[]] });
            setScreen("lines");
          }}
          onBack={() => setScreen("lines")}
        />
      )}

      {screen === "picker" && (
        <WidgetPicker
          onSelect={(type) => {
            const newItem = createWidgetItem(type);
            const newLines = [...settings.lines];
            newLines[editingLine] = [...(newLines[editingLine] ?? []), newItem];
            updateSettings({ ...settings, lines: newLines });
            setScreen("items");
          }}
          onBack={() => setScreen("items")}
        />
      )}

      {screen === "colors" && (
        <ColorMenu
          settings={settings}
          onChange={(newSettings) => updateSettings(newSettings)}
          onBack={() => setScreen("main")}
        />
      )}

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>Ctrl+S save | Ctrl+C quit</Text>
      </Box>
    </Box>
  );
}
