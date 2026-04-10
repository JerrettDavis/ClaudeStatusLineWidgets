import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";

interface Props {
  onSelect: (action: string) => void;
  minimalistMode?: boolean;
}

export function MainMenu({ onSelect, minimalistMode }: Props) {
  const items = [
    { label: "Edit Lines           Configure which widgets appear on each line", value: "lines" },
    { label: "Edit Colors          Change widget colors", value: "colors" },
    { label: `Minimalist Mode     ${minimalistMode ? "On" : "Off"}`, value: "minimal" },
    { label: "Reset to Defaults    Restore default layout", value: "reset" },
    { label: "Save & Exit          Save settings and quit", value: "save" },
    { label: "Exit                 Quit without saving", value: "exit" },
  ];
  return (
    <Box flexDirection="column">
      <Text bold>Main Menu</Text>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onSelect={(item) => onSelect(item.value)}
        />
      </Box>
    </Box>
  );
}
