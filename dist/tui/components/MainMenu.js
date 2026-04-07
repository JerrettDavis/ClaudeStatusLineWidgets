import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
const items = [
    { label: "Edit Lines           Configure which widgets appear on each line", value: "lines" },
    { label: "Edit Colors          Change widget colors", value: "colors" },
    { label: "Reset to Defaults    Restore default layout", value: "reset" },
    { label: "Save & Exit          Save settings and quit", value: "save" },
    { label: "Exit                 Quit without saving", value: "exit" },
];
export function MainMenu({ onSelect }) {
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, children: "Main Menu" }), _jsx(Box, { marginTop: 1, children: _jsx(SelectInput, { items: items, onSelect: (item) => onSelect(item.value) }) })] }));
}
