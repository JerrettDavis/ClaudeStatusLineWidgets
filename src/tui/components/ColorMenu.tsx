import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import type { Settings, WidgetItemConfig } from "../../config/schema.js";
import { getWidget } from "../../widgets/registry.js";

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onBack: () => void;
}

const COLORS = [
  "default", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
  "gray", "redBright", "greenBright", "yellowBright", "blueBright", "magentaBright", "cyanBright",
];

type ColorScreen = "select-widget" | "select-color";

export function ColorMenu({ settings, onChange, onBack }: Props) {
  const [screen, setScreen] = useState<ColorScreen>("select-widget");
  const [selectedWidget, setSelectedWidget] = useState<{ lineIdx: number; itemIdx: number } | null>(null);

  useInput((_input, key) => {
    if (key.escape) {
      if (screen === "select-color") setScreen("select-widget");
      else onBack();
    }
  });

  // Build flat list of all colorable widgets
  const allWidgets: { label: string; lineIdx: number; itemIdx: number; item: WidgetItemConfig }[] = [];
  for (let li = 0; li < settings.lines.length; li++) {
    for (let wi = 0; wi < settings.lines[li].length; wi++) {
      const item = settings.lines[li][wi];
      const widget = getWidget(item.type);
      if (!widget || !widget.supportsColors()) continue;
      const color = item.color ?? widget.getDefaultColor();
      allWidgets.push({
        label: `Line ${li + 1}: ${widget.getDisplayName()} [${color}]`,
        lineIdx: li,
        itemIdx: wi,
        item,
      });
    }
  }

  if (screen === "select-widget") {
    if (allWidgets.length === 0) {
      return (
        <Box flexDirection="column">
          <Text bold>Edit Colors</Text>
          <Text dimColor>No colorable widgets found. esc = back</Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        <Text bold>Edit Colors — Select Widget</Text>
        <Text dimColor>esc = back</Text>
        <Box marginTop={1}>
          <SelectInput
            items={allWidgets.map((w, i) => ({ label: w.label, value: String(i) }))}
            onSelect={(item) => {
              const idx = Number(item.value);
              setSelectedWidget({ lineIdx: allWidgets[idx].lineIdx, itemIdx: allWidgets[idx].itemIdx });
              setScreen("select-color");
            }}
          />
        </Box>
      </Box>
    );
  }

  // select-color screen
  const colorItems = COLORS.map((c) => ({ label: c, value: c }));

  return (
    <Box flexDirection="column">
      <Text bold>Select Color</Text>
      <Text dimColor>esc = back to widget list</Text>
      <Box marginTop={1}>
        <SelectInput
          items={colorItems}
          onSelect={(item) => {
            if (!selectedWidget) return;
            const newLines = settings.lines.map((line, li) =>
              li === selectedWidget.lineIdx
                ? line.map((w, wi) =>
                    wi === selectedWidget.itemIdx
                      ? { ...w, color: item.value === "default" ? undefined : item.value }
                      : w
                  )
                : line
            );
            onChange({ ...settings, lines: newLines });
            setScreen("select-widget");
          }}
        />
      </Box>
    </Box>
  );
}
