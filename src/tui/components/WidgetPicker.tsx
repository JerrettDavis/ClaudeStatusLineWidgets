import React, { useMemo } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { getWidgetCatalog, getWidgetCategories, getDataKeyGroups } from "../../widgets/registry.js";
import { getDataKeyInfo } from "../../widgets/data-keys.js";

interface Props {
  onSelect: (type: string) => void;
  onSelectGroup: (dataKey: string) => void;
  onBack: () => void;
}

export function WidgetPicker({ onSelect, onSelectGroup, onBack }: Props) {
  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  const catalog = useMemo(() => getWidgetCatalog(), []);
  const categories = useMemo(() => getWidgetCategories(), []);
  const dataKeyGroups = useMemo(() => getDataKeyGroups(), []);

  const items = useMemo(() => {
    // Track which widget types are consumed by a data key group
    const groupedTypes = new Set<string>();
    for (const entries of dataKeyGroups.values()) {
      for (const entry of entries) {
        groupedTypes.add(entry.type);
      }
    }

    // Track which data keys we've already added (to avoid duplicates across categories)
    const addedDataKeys = new Set<string>();

    const result: { label: string; value: string }[] = [];
    for (const cat of categories) {
      const widgets = catalog.filter((w) => w.category === cat);
      for (const w of widgets) {
        if (w.dataKey && groupedTypes.has(w.type)) {
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
              value: `__group__${w.dataKey}`,
            });
          }
        } else {
          // Ungrouped widget — show individually as before
          result.push({
            label: `[${cat}] ${w.displayName}${w.variants?.length ? ` (${w.variants.join("/")})` : ""} — ${w.description}`,
            value: w.type,
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
            if (item.value.startsWith("__group__")) {
              onSelectGroup(item.value.slice("__group__".length));
            } else {
              onSelect(item.value);
            }
          }}
        />
      </Box>
    </Box>
  );
}
