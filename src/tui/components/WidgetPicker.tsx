import React, { useMemo } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { getWidgetCatalog, getWidgetCategories } from "../../widgets/registry.js";

interface Props {
  onSelect: (type: string) => void;
  onBack: () => void;
}

export function WidgetPicker({ onSelect, onBack }: Props) {
  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  const catalog = useMemo(() => getWidgetCatalog(), []);
  const categories = useMemo(() => getWidgetCategories(), []);

  const items = useMemo(() => {
    const result: { label: string; value: string }[] = [];
    for (const cat of categories) {
      const widgets = catalog.filter((w) => w.category === cat);
      for (const w of widgets) {
        result.push({
          label: `[${cat}] ${w.displayName} — ${w.description}`,
          value: w.type,
        });
      }
    }
    return result;
  }, [catalog, categories]);

  return (
    <Box flexDirection="column">
      <Text bold>Add Widget</Text>
      <Text dimColor>esc = cancel</Text>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onSelect={(item) => onSelect(item.value)}
        />
      </Box>
    </Box>
  );
}
