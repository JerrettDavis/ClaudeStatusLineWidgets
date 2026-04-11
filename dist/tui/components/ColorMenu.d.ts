import type { Settings } from "../../config/schema.js";
interface Props {
    settings: Settings;
    onChange: (settings: Settings) => void;
    onBack: () => void;
}
export declare function ColorMenu({ settings, onChange, onBack }: Props): import("react/jsx-runtime").JSX.Element;
export {};
