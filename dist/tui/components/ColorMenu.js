import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { getWidget } from "../../widgets/registry.js";
const COLORS = [
    "default", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
    "gray", "redBright", "greenBright", "yellowBright", "blueBright", "magentaBright", "cyanBright",
];
export function ColorMenu({ settings, onChange, onBack }) {
    const [screen, setScreen] = useState("select-widget");
    const [selectedWidget, setSelectedWidget] = useState(null);
    useInput((_input, key) => {
        if (key.escape) {
            if (screen === "select-color")
                setScreen("select-widget");
            else
                onBack();
        }
    });
    // Build flat list of all colorable widgets
    const allWidgets = [];
    for (let li = 0; li < settings.lines.length; li++) {
        for (let wi = 0; wi < settings.lines[li].length; wi++) {
            const item = settings.lines[li][wi];
            const widget = getWidget(item.type);
            if (!widget || !widget.supportsColors())
                continue;
            const color = item.color ?? widget.getDefaultColor();
            allWidgets.push({
                label: `Line ${li + 1}: ${widget.getDisplayName()} [${color}]`,
                lineIdx: li,
                itemIdx: wi,
                item,
            });
        }
    }
    if (screen === "select-widget") {
        if (allWidgets.length === 0) {
            return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, children: "Edit Colors" }), _jsx(Text, { dimColor: true, children: "No colorable widgets found. esc = back" })] }));
        }
        return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, children: "Edit Colors \u2014 Select Widget" }), _jsx(Text, { dimColor: true, children: "esc = back" }), _jsx(Box, { marginTop: 1, children: _jsx(SelectInput, { items: allWidgets.map((w, i) => ({ label: w.label, value: String(i) })), onSelect: (item) => {
                            const idx = Number(item.value);
                            setSelectedWidget({ lineIdx: allWidgets[idx].lineIdx, itemIdx: allWidgets[idx].itemIdx });
                            setScreen("select-color");
                        } }) })] }));
    }
    // select-color screen
    const colorItems = COLORS.map((c) => ({ label: c, value: c }));
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, children: "Select Color" }), _jsx(Text, { dimColor: true, children: "esc = back to widget list" }), _jsx(Box, { marginTop: 1, children: _jsx(SelectInput, { items: colorItems, onSelect: (item) => {
                        if (!selectedWidget)
                            return;
                        const newLines = settings.lines.map((line, li) => li === selectedWidget.lineIdx
                            ? line.map((w, wi) => wi === selectedWidget.itemIdx
                                ? { ...w, color: item.value === "default" ? undefined : item.value }
                                : w)
                            : line);
                        onChange({ ...settings, lines: newLines });
                        setScreen("select-widget");
                    } }) })] }));
}
