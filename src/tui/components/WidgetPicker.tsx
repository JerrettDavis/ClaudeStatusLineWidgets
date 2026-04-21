import React, { useMemo } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { getWidgetCatalog, getDataKeyGroups } from "../../widgets/registry.js";
import { getDataKeyInfo } from "../../widgets/data-keys.js";

interface Props {
  onSelect: (type: string) => void;
  onSelectGroup: (dataKey: string) => void;
  onBack: () => void;
}

type PickerValue =
  | { kind: "group"; dataKey: string }
  | { kind: "widget"; type: string };

export function WidgetPicker({ onSelect, onSelectGroup, onBack }: Props) {
  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  const catalog = useMemo(() => getWidgetCatalog(), []);
  const categories = useMemo(() => [...new Set(catalog.map((e) => e.category))], [catalog]);
  const dataKeyGroups = useMemo(() => getDataKeyGroups(catalog), [catalog]);

  const items = useMemo(() => {
    // Track which data keys we've already added (to avoid duplicates across categories)
    const addedDataKeys = new Set<string>();

    const result: { label: string; value: PickerValue }[] = [];
    for (const cat of categories) {
      const widgets = catalog.filter((w) => w.category === cat);
      for (const w of widgets) {
        if (w.dataKey) {
          // This widget belongs to a data key group — show the group entry instead
          if (!addedDataKeys.has(w.dataKey)) {
            addedDataKeys.add(w.dataKey);
            const info = getDataKeyInfo(w.dataKey);
            const groupEntries = dataKeyGroups.get(w.dataKey) ?? [];
            const displayName = info?.displayName ?? w.dataKey;
            const description = info?.description ?? "";
            const groupCategory = info?.category ?? cat;
            result.push({
              label: `[${groupCategory}] ${displayName} (${groupEntries.length} widgets) — ${description}`,
              value: { kind: "group", dataKey: w.dataKey },
            });
          }
        } else {
          // Ungrouped widget — show individually as before
          result.push({
            label: `[${cat}] ${w.displayName}${w.variants?.length ? ` (${w.variants.join("/")})` : ""} — ${w.description}`,
            value: { kind: "widget", type: w.type },
          });
        }
      }
    }
    return result;
  }, [catalog, categories, dataKeyGroups]);

  return (
    <Box flexDirection="column">
      <Text bold>Add Widget</Text>
      <Text dimColor>esc = cancel | groups show related widgets</Text>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onSelect={(item) => {
            if (item.value.kind === "group") {
              onSelectGroup(item.value.dataKey);
            } else {
              onSelect(item.value.type);
            }
          }}
        />
      </Box>
    </Box>
  );
}
