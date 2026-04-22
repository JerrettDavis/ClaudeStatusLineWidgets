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
    // Pre-build group entries keyed by their canonical category so each group
    // always appears under the correct category regardless of widget order.
    const groupItemsByCategory = new Map<string, { label: string; value: PickerValue }[]>();
    for (const [dataKey, groupEntries] of dataKeyGroups) {
      const info = getDataKeyInfo(dataKey);
      // Use the canonical category from data-key metadata; fall back to the
      // first entry's category so extension-defined groups still work.
      const canonicalCategory = info?.category ?? groupEntries[0]?.category ?? "Other";
      const displayName = info?.displayName ?? dataKey;
      const description = info?.description ?? "";
      const item = {
        label: `[${canonicalCategory}] ${displayName} (${groupEntries.length} widgets)${description ? ` — ${description}` : ""}`,
        value: { kind: "group" as const, dataKey },
      };
      const bucket = groupItemsByCategory.get(canonicalCategory) ?? [];
      bucket.push(item);
      groupItemsByCategory.set(canonicalCategory, bucket);
    }

    const result: { label: string; value: PickerValue }[] = [];

    // Collect all categories: ones from the catalog plus any from data-key groups
    const allCategories = [
      ...categories,
      ...[...groupItemsByCategory.keys()].filter((c) => !categories.includes(c)),
    ];

    for (const cat of allCategories) {
      // Emit group entries whose canonical category is this one
      for (const groupItem of groupItemsByCategory.get(cat) ?? []) {
        result.push(groupItem);
      }

      // Emit ungrouped widgets in this category
      const widgets = catalog.filter((w) => w.category === cat && !w.dataKey);
      for (const w of widgets) {
        result.push({
          label: `[${cat}] ${w.displayName}${w.variants?.length ? ` (${w.variants.join("/")})` : ""} — ${w.description}`,
          value: { kind: "widget", type: w.type },
        });
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
