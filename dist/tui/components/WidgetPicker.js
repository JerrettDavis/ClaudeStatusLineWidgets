import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { getWidgetCatalog, getWidgetCategories } from "../../widgets/registry.js";
export function WidgetPicker({ onSelect, onBack }) {
    useInput((_input, key) => {
        if (key.escape)
            onBack();
    });
    const catalog = useMemo(() => getWidgetCatalog(), []);
    const categories = useMemo(() => getWidgetCategories(), []);
    const items = useMemo(() => {
        const result = [];
        for (const cat of categories) {
            const widgets = catalog.filter((w) => w.category === cat);
            for (const w of widgets) {
                result.push({
                    label: `[${cat}] ${w.displayName}${w.variants?.length ? ` (${w.variants.join("/")})` : ""} — ${w.description}`,
                    value: w.type,
                });
            }
        }
        return result;
    }, [catalog, categories]);
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, children: "Add Widget" }), _jsx(Text, { dimColor: true, children: "esc = cancel" }), _jsx(Box, { marginTop: 1, children: _jsx(SelectInput, { items: items, onSelect: (item) => onSelect(item.value) }) })] }));
}
