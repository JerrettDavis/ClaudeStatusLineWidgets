import { dim } from "../colors.js";
export class SeparatorWidget {
    getDisplayName() { return "Separator"; }
    getDescription() { return "Visual separator between widgets"; }
    getCategory() { return "Layout"; }
    getDefaultColor() { return "dim"; }
    supportsColors() { return false; }
    render(_item, _ctx) {
        return dim(" | ");
    }
}
