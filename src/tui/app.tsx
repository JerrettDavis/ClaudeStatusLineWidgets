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
      saveSettings(settings);
      setHasChanges(false);
      setFlash("Saved!");
      setTimeout(() => setFlash(null), 2000);
    }
  });

  const updateSettings = (next: Settings) => {
    setSettings(next);
    setHasChanges(true);
  };

  const handleSaveAndExit = () => {
    saveSettings(settings);
    exit();
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
          onSelect={(action) => {
            if (action === "lines") setScreen("lines");
            else if (action === "colors") setScreen("colors");
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
            const newItem: WidgetItemConfig = { id: generateId(), type };
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
