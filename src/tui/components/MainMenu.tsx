import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";

interface Props {
  onSelect: (action: string) => void;
}

const items = [
  { label: "Edit Lines           Configure which widgets appear on each line", value: "lines" },
  { label: "Edit Colors          Change widget colors", value: "colors" },
  { label: "Reset to Defaults    Restore default layout", value: "reset" },
  { label: "Save & Exit          Save settings and quit", value: "save" },
  { label: "Exit                 Quit without saving", value: "exit" },
];

export function MainMenu({ onSelect }: Props) {
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
