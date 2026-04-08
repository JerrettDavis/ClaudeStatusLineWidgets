export class CustomTextWidget {
    getDisplayName() { return "Custom Text"; }
    getDescription() { return "Static custom text"; }
    getCategory() { return "Layout"; }
    getDefaultColor() { return "default"; }
    supportsColors() { return true; }
    render(item, _ctx) {
        return item.customText ?? null;
    }
}
