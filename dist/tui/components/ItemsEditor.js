import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { getWidget } from "../../widgets/registry.js";
export function ItemsEditor({ line, lineIndex, onChange, onAddWidget, onDeleteLine, onBack }) {
    const [cursor, setCursor] = useState(0);
    const [moveMode, setMoveMode] = useState(false);
    const safeIdx = Math.min(cursor, Math.max(0, line.length - 1));
    useInput((input, key) => {
        if (key.escape) {
            if (moveMode) {
                setMoveMode(false);
            }
            else {
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
            }
            else {
                setCursor(Math.max(0, safeIdx - 1));
            }
        }
        if (key.downArrow) {
            if (moveMode && safeIdx < line.length - 1) {
                const next = [...line];
                [next[safeIdx], next[safeIdx + 1]] = [next[safeIdx + 1], next[safeIdx]];
                onChange(next);
                setCursor(safeIdx + 1);
            }
            else {
                setCursor(Math.min(line.length - 1, safeIdx + 1));
            }
        }
        if (input === "a")
            onAddWidget();
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
        if (input === "m")
            setMoveMode(!moveMode);
        if (input === "x")
            onDeleteLine();
    });
    return (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Text, { bold: true, children: ["Line ", lineIndex + 1, " Widgets"] }), _jsxs(Text, { dimColor: true, children: ["a = add | d = delete | v = cycle variant | m = ", moveMode ? "stop moving" : "move mode", " | x = delete line | esc = back"] }), _jsxs(Box, { flexDirection: "column", marginTop: 1, children: [line.length === 0 && _jsx(Text, { dimColor: true, children: "(empty \u2014 press a to add widgets)" }), line.map((item, i) => {
                        const widget = getWidget(item.type);
                        const name = widget?.getDisplayName() ?? item.type;
                        const selected = i === safeIdx;
                        return (_jsxs(Box, { children: [_jsxs(Text, { color: selected ? "cyan" : undefined, bold: selected, children: [selected ? (moveMode ? "↕ " : "▸ ") : "  ", name] }), item.variant && _jsxs(Text, { dimColor: true, children: [" (", item.variant, ")"] }), item.color && _jsxs(Text, { dimColor: true, children: [" [", item.color, "]"] })] }, item.id));
                    })] })] }));
}
