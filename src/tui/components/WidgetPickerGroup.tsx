import React, { useMemo } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { getWidgetsByDataKey } from "../../widgets/registry.js";
import { getDataKeyInfo } from "../../widgets/data-keys.js";

interface Props {
  dataKey: string;
  onSelect: (type: string) => void;
  onBack: () => void;
}

export function WidgetPickerGroup({ dataKey, onSelect, onBack }: Props) {
  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  const info = useMemo(() => getDataKeyInfo(dataKey), [dataKey]);
  const widgets = useMemo(() => getWidgetsByDataKey(dataKey), [dataKey]);

  const items = useMemo(() => {
    return widgets.map((w) => ({
      label: `${w.displayName}${w.variants?.length ? ` (${w.variants.join("/")})` : ""} — ${w.description}`,
      value: w.type,
    }));
  }, [widgets]);

  return (
    <Box flexDirection="column">
      <Text bold>{info?.displayName ?? dataKey}</Text>
      <Text dimColor>{info?.description ?? "Select a widget variation"}</Text>
      <Text dimColor>esc = back to picker</Text>
      <Box marginTop={1}>
        {items.length === 0 ? (
          <Text dimColor>No widgets available for this group</Text>
        ) : (
          <SelectInput
            items={items}
            onSelect={(item) => onSelect(item.value)}
          />
        )}
      </Box>
    </Box>
  );
}
