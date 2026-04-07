import React from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import type { Settings } from "../../config/schema.js";
import { getWidget } from "../../widgets/registry.js";

interface Props {
  settings: Settings;
  onSelectLine: (index: number) => void;
  onAddLine: () => void;
  onBack: () => void;
}

export function LineSelector({ settings, onSelectLine, onAddLine, onBack }: Props) {
  useInput((input, key) => {
    if (key.escape) onBack();
    if (input === "a") onAddLine();
  });

  const items = settings.lines.map((line, i) => {
    const widgetNames = line
      .filter((w) => w.type !== "separator")
      .map((w) => {
        const widget = getWidget(w.type);
        return widget?.getDisplayName() ?? w.type;
      })
      .join(", ");
    return {
      label: `Line ${i + 1}: ${widgetNames || "(empty)"}`,
      value: String(i),
    };
  });

  return (
    <Box flexDirection="column">
      <Text bold>Select Line to Edit</Text>
      <Text dimColor>a = add line | esc = back</Text>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onSelect={(item) => onSelectLine(Number(item.value))}
        />
      </Box>
    </Box>
  );
}
