import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { loadSettings, saveSettings } from "../config/loader.js";
import { createDefaultSettings, generateId } from "../config/schema.js";
import { renderStatusLine } from "../renderer.js";
import { MainMenu } from "./components/MainMenu.js";
import { LineSelector } from "./components/LineSelector.js";
import { ItemsEditor } from "./components/ItemsEditor.js";
import { WidgetPicker } from "./components/WidgetPicker.js";
import { ColorMenu } from "./components/ColorMenu.js";
export function App() {
    const { exit } = useApp();
    const [settings, setSettings] = useState(createDefaultSettings);
    const [screen, setScreen] = useState("main");
    const [editingLine, setEditingLine] = useState(0);
    const [hasChanges, setHasChanges] = useState(false);
    const [flash, setFlash] = useState(null);
    useEffect(() => {
        setSettings(loadSettings());
    }, []);
    // Global keys
    useInput((input, key) => {
        if (key.ctrl && input === "s") {
            saveSettings(settings);
            setHasChanges(false);
            setFlash("Saved!");
            setTimeout(() => setFlash(null), 2000);
        }
    });
    const updateSettings = (next) => {
        setSettings(next);
        setHasChanges(true);
    };
    const handleSaveAndExit = () => {
        saveSettings(settings);
        exit();
    };
    const handleExit = () => {
        exit();
    };
    // Build preview context
    const previewCtx = {
        payload: {},
        cacheTTL: { remainingSeconds: -1, tier: "none", lastWriteTime: null, expiresAt: null, cacheReadActive: false },
        cacheStats: { totalReads: 0, totalWrites: 0, breakCount: 0, lastBreakTime: null, lastBreakTokens: 0, avgBreakTokens: 0 },
        usageData: null,
        headroomStats: null,
        isPreview: true,
    };
    const previewOutput = renderStatusLine(settings, previewCtx);
    return (_jsxs(Box, { flexDirection: "column", padding: 1, children: [_jsxs(Box, { marginBottom: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "Claude StatusLine Widgets" }), _jsx(Text, { children: " " }), hasChanges && _jsx(Text, { color: "yellow", children: "[unsaved]" }), flash && _jsxs(Text, { color: "green", children: [" ", flash] })] }), _jsxs(Box, { flexDirection: "column", marginBottom: 1, borderStyle: "round", borderColor: "gray", paddingX: 1, children: [_jsx(Text, { dimColor: true, children: "Preview:" }), previewOutput.split("\n").map((line, i) => (_jsx(Text, { children: line }, i)))] }), screen === "main" && (_jsx(MainMenu, { onSelect: (action) => {
                    if (action === "lines")
                        setScreen("lines");
                    else if (action === "colors")
                        setScreen("colors");
                    else if (action === "save")
                        handleSaveAndExit();
                    else if (action === "exit")
                        handleExit();
                    else if (action === "reset") {
                        updateSettings(createDefaultSettings());
                        setFlash("Reset to defaults");
                        setTimeout(() => setFlash(null), 2000);
                    }
                } })), screen === "lines" && (_jsx(LineSelector, { settings: settings, onSelectLine: (idx) => {
                    setEditingLine(idx);
                    setScreen("items");
                }, onAddLine: () => {
                    updateSettings({ ...settings, lines: [...settings.lines, []] });
                }, onBack: () => setScreen("main") })), screen === "items" && (_jsx(ItemsEditor, { line: settings.lines[editingLine] ?? [], lineIndex: editingLine, onChange: (newLine) => {
                    const newLines = [...settings.lines];
                    newLines[editingLine] = newLine;
                    updateSettings({ ...settings, lines: newLines });
                }, onAddWidget: () => setScreen("picker"), onDeleteLine: () => {
                    const newLines = settings.lines.filter((_, i) => i !== editingLine);
                    updateSettings({ ...settings, lines: newLines.length > 0 ? newLines : [[]] });
                    setScreen("lines");
                }, onBack: () => setScreen("lines") })), screen === "picker" && (_jsx(WidgetPicker, { onSelect: (type) => {
                    const newItem = { id: generateId(), type };
                    const newLines = [...settings.lines];
                    newLines[editingLine] = [...(newLines[editingLine] ?? []), newItem];
                    updateSettings({ ...settings, lines: newLines });
                    setScreen("items");
                }, onBack: () => setScreen("items") })), screen === "colors" && (_jsx(ColorMenu, { settings: settings, onChange: (newSettings) => updateSettings(newSettings), onBack: () => setScreen("main") })), _jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: "Ctrl+S save | Ctrl+C quit" }) })] }));
}
