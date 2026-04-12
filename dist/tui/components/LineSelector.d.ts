import type { Settings } from "../../config/schema.js";
interface Props {
    settings: Settings;
    onSelectLine: (index: number) => void;
    onAddLine: () => void;
    onBack: () => void;
}
export declare function LineSelector({ settings, onSelectLine, onAddLine, onBack }: Props): import("react/jsx-runtime").JSX.Element;
export {};
