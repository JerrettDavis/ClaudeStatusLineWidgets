import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { getWidget } from "../../widgets/registry.js";
export function LineSelector({ settings, onSelectLine, onAddLine, onBack }) {
    useInput((input, key) => {
        if (key.escape)
            onBack();
        if (input === "a")
            onAddLine();
    });
    const items = settings.lines.map((line, i) => {
        const widgetNames = line
            .filter((w) => w.type !== "separator")
            .map((w) => {
            const widget = getWidget(w.type);
            return widget?.getDisplayName() ?? w.type;
        })
            .join(", ");
        return {
            label: `Line ${i + 1}: ${widgetNames || "(empty)"}`,
            value: String(i),
        };
    });
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, children: "Select Line to Edit" }), _jsx(Text, { dimColor: true, children: "a = add line | esc = back" }), _jsx(Box, { marginTop: 1, children: _jsx(SelectInput, { items: items, onSelect: (item) => onSelectLine(Number(item.value)) }) })] }));
}
