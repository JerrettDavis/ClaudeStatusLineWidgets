import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { WidgetItemConfig } from "../../config/schema.js";
import { getWidget } from "../../widgets/registry.js";

interface Props {
  line: WidgetItemConfig[];
  lineIndex: number;
  onChange: (line: WidgetItemConfig[]) => void;
  onAddWidget: () => void;
  onDeleteLine: () => void;
  onBack: () => void;
}

export function ItemsEditor({ line, lineIndex, onChange, onAddWidget, onDeleteLine, onBack }: Props) {
  const [cursor, setCursor] = useState(0);
  const [moveMode, setMoveMode] = useState(false);

  const safeIdx = Math.min(cursor, Math.max(0, line.length - 1));

  useInput((input, key) => {
    if (key.escape) {
      if (moveMode) {
        setMoveMode(false);
      } else {
        onBack();
      }
      return;
    }

    if (key.upArrow) {
      if (moveMode && safeIdx > 0) {
        const next = [...line];
        [next[safeIdx - 1], next[safeIdx]] = [next[safeIdx], next[safeIdx - 1]];
        onChange(next);
        setCursor(safeIdx - 1);
      } else {
        setCursor(Math.max(0, safeIdx - 1));
      }
    }

    if (key.downArrow) {
      if (moveMode && safeIdx < line.length - 1) {
        const next = [...line];
        [next[safeIdx], next[safeIdx + 1]] = [next[safeIdx + 1], next[safeIdx]];
        onChange(next);
        setCursor(safeIdx + 1);
      } else {
        setCursor(Math.min(line.length - 1, safeIdx + 1));
      }
    }

    if (input === "a") onAddWidget();
    if (input === "d" || key.delete) {
      if (line.length > 0) {
        const next = line.filter((_, i) => i !== safeIdx);
        onChange(next);
        setCursor(Math.min(safeIdx, next.length - 1));
      }
    }
    if (input === "v" && line.length > 0) {
      const widget = getWidget(line[safeIdx]?.type);
      const variants = widget?.getVariants?.() ?? [];
      if (variants.length > 0) {
        const currentVariant = line[safeIdx]?.variant ?? variants[0];
        const currentIndex = Math.max(0, variants.indexOf(currentVariant));
        const nextVariant = variants[(currentIndex + 1) % variants.length];
        const next = [...line];
        next[safeIdx] = { ...next[safeIdx], variant: nextVariant };
        onChange(next);
      }
    }
    if (input === "m") setMoveMode(!moveMode);
    if (input === "x") onDeleteLine();
  });

  return (
    <Box flexDirection="column">
      <Text bold>Line {lineIndex + 1} Widgets</Text>
      <Text dimColor>
        a = add | d = delete | v = cycle variant | m = {moveMode ? "stop moving" : "move mode"} | x = delete line | esc = back
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {line.length === 0 && <Text dimColor>(empty — press a to add widgets)</Text>}
        {line.map((item, i) => {
          const widget = getWidget(item.type);
          const name = widget?.getDisplayName() ?? item.type;
          const selected = i === safeIdx;
          return (
            <Box key={item.id}>
              <Text color={selected ? "cyan" : undefined} bold={selected}>
                {selected ? (moveMode ? "↕ " : "▸ ") : "  "}
                {name}
              </Text>
              {item.variant && <Text dimColor> ({item.variant})</Text>}
              {item.color && <Text dimColor> [{item.color}]</Text>}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
