import { describe, it, expect } from "vitest";
import { getWidgetsByDataKey, getDataKeyGroups, getWidgetCatalog } from "./registry.js";
import { DATA_KEY } from "./data-keys.js";
import type { WidgetCatalogEntry } from "./types.js";

describe("getWidgetsByDataKey", () => {
  it("returns all entries matching the given data key", () => {
    const results = getWidgetsByDataKey(DATA_KEY.CACHE_HEALTH);
    expect(results.length).toBeGreaterThan(0);
    for (const entry of results) {
      expect(entry.dataKey).toBe(DATA_KEY.CACHE_HEALTH);
    }
  });

  it("returns an empty array when no entries match", () => {
    const results = getWidgetsByDataKey("non-existent-key");
    expect(results).toEqual([]);
  });

  it("ignores entries whose dataKey is undefined", () => {
    const catalog = getWidgetCatalog();
    const ungrouped = catalog.filter((e) => e.dataKey === undefined);
    expect(ungrouped.length).toBeGreaterThan(0);
    for (const entry of ungrouped) {
      expect(getWidgetsByDataKey(entry.type)).toEqual([]);
    }
  });

  it("accepts a pre-built catalog to avoid redundant builds", () => {
    const catalog: WidgetCatalogEntry[] = [
      { type: "a", widget: {} as any, dataKey: "my-group" },
      { type: "b", widget: {} as any, dataKey: "my-group" },
      { type: "c", widget: {} as any },
    ];
    const results = getWidgetsByDataKey("my-group", catalog);
    expect(results).toHaveLength(2);
    expect(results.map((e) => e.type)).toEqual(["a", "b"]);
  });
});

describe("getDataKeyGroups", () => {
  it("groups entries by their data key", () => {
    const groups = getDataKeyGroups();
    expect(groups.size).toBeGreaterThan(0);
    for (const [key, entries] of groups) {
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(entry.dataKey).toBe(key);
      }
    }
  });

  it("omits entries without a data key", () => {
    const catalog = getWidgetCatalog();
    const ungroupedCount = catalog.filter((e) => !e.dataKey).length;
    expect(ungroupedCount).toBeGreaterThan(0);

    const groups = getDataKeyGroups(catalog);
    const groupedCount = [...groups.values()].reduce((sum, entries) => sum + entries.length, 0);
    expect(groupedCount).toBe(catalog.length - ungroupedCount);
  });

  it("groups multiple entries under the same key", () => {
    const catalog: WidgetCatalogEntry[] = [
      { type: "x", widget: {} as any, dataKey: "shared" },
      { type: "y", widget: {} as any, dataKey: "shared" },
      { type: "z", widget: {} as any, dataKey: "other" },
    ];
    const groups = getDataKeyGroups(catalog);
    expect(groups.get("shared")).toHaveLength(2);
    expect(groups.get("other")).toHaveLength(1);
  });

  it("returns an empty map for a catalog with no data keys", () => {
    const catalog: WidgetCatalogEntry[] = [
      { type: "p", widget: {} as any },
      { type: "q", widget: {} as any },
    ];
    const groups = getDataKeyGroups(catalog);
    expect(groups.size).toBe(0);
  });

  it("accepts a pre-built catalog to avoid redundant builds", () => {
    const catalog: WidgetCatalogEntry[] = [
      { type: "a", widget: {} as any, dataKey: "g1" },
      { type: "b", widget: {} as any, dataKey: "g2" },
    ];
    const groups = getDataKeyGroups(catalog);
    expect(groups.size).toBe(2);
    expect(groups.has("g1")).toBe(true);
    expect(groups.has("g2")).toBe(true);
  });
});
