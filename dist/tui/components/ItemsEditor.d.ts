import type { WidgetItemConfig } from "../../config/schema.js";
interface Props {
    line: WidgetItemConfig[];
    lineIndex: number;
    onChange: (line: WidgetItemConfig[]) => void;
    onAddWidget: () => void;
    onDeleteLine: () => void;
    onBack: () => void;
}
export declare function ItemsEditor({ line, lineIndex, onChange, onAddWidget, onDeleteLine, onBack }: Props): import("react/jsx-runtime").JSX.Element;
export {};
