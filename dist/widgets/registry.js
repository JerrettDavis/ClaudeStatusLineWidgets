import { PathWidget } from "./PathWidget.js";
import { BranchWidget } from "./BranchWidget.js";
import { ModelWidget } from "./ModelWidget.js";
import { CostWidget } from "./CostWidget.js";
import { ContextBarWidget } from "./ContextBarWidget.js";
import { CacheTTLWidget } from "./CacheTTLWidget.js";
import { CacheTokensWidget } from "./CacheTokensWidget.js";
import { Usage5hWidget } from "./Usage5hWidget.js";
import { Usage7dWidget } from "./Usage7dWidget.js";
import { UsageOverageWidget } from "./UsageOverageWidget.js";
import { HeadroomTokensWidget } from "./HeadroomTokensWidget.js";
import { HeadroomCompressionWidget } from "./HeadroomCompressionWidget.js";
import { HeadroomCostWidget } from "./HeadroomCostWidget.js";
import { HeadroomCacheHitWidget } from "./HeadroomCacheHitWidget.js";
import { SeparatorWidget } from "./SeparatorWidget.js";
import { CustomTextWidget } from "./CustomTextWidget.js";
const WIDGET_MANIFEST = [
    { type: "path", create: () => new PathWidget() },
    { type: "branch", create: () => new BranchWidget() },
    { type: "model", create: () => new ModelWidget() },
    { type: "cost", create: () => new CostWidget() },
    { type: "context-bar", create: () => new ContextBarWidget() },
    { type: "cache-ttl", create: () => new CacheTTLWidget() },
    { type: "cache-tokens", create: () => new CacheTokensWidget() },
    { type: "usage-5h", create: () => new Usage5hWidget() },
    { type: "usage-7d", create: () => new Usage7dWidget() },
    { type: "usage-overage", create: () => new UsageOverageWidget() },
    { type: "headroom-tokens", create: () => new HeadroomTokensWidget() },
    { type: "headroom-compression", create: () => new HeadroomCompressionWidget() },
    { type: "headroom-cost", create: () => new HeadroomCostWidget() },
    { type: "headroom-cache-hit", create: () => new HeadroomCacheHitWidget() },
    { type: "separator", create: () => new SeparatorWidget() },
    { type: "custom-text", create: () => new CustomTextWidget() },
];
const widgetRegistry = new Map(WIDGET_MANIFEST.map((entry) => [entry.type, entry.create()]));
export function getWidget(type) {
    return widgetRegistry.get(type) ?? null;
}
export function getAllWidgetTypes() {
    return WIDGET_MANIFEST.map((e) => e.type);
}
export function getWidgetCatalog() {
    return WIDGET_MANIFEST.map((entry) => {
        const w = widgetRegistry.get(entry.type);
        return {
            type: entry.type,
            displayName: w.getDisplayName(),
            description: w.getDescription(),
            category: w.getCategory(),
        };
    });
}
export function getWidgetCategories() {
    const cats = new Set(getWidgetCatalog().map((e) => e.category));
    return [...cats];
}
