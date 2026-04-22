import { describe, it, expect } from "vitest";
import { getWidgetsByDataKey, getDataKeyGroups, getWidgetCatalog } from "./registry.js";
import { DATA_KEY } from "./data-keys.js";
import type { WidgetCatalogEntry } from "./types.js";

function entry(type: string, dataKey?: string): WidgetCatalogEntry {
  return { type, displayName: type, description: "", category: "Test", dataKey };
}

describe("getWidgetsByDataKey", () => {
  it("returns all entries matching the given data key", () => {
    const results = getWidgetsByDataKey(DATA_KEY.CACHE_HEALTH);
    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      expect(result.dataKey).toBe(DATA_KEY.CACHE_HEALTH);
    }
  });

  it("returns an empty array when no entries match", () => {
    const results = getWidgetsByDataKey("non-existent-key");
    expect(results).toEqual([]);
  });

  it("ignores entries whose dataKey is undefined", () => {
    const catalog: WidgetCatalogEntry[] = [
      entry("grouped-a", "group-1"),
      entry("ungrouped-a", undefined),
      entry("grouped-b", "group-1"),
      entry("ungrouped-b"),
      entry("other-group", "group-2"),
    ];
    const results = getWidgetsByDataKey("group-1", catalog);
    expect(results).toHaveLength(2);
    expect(results.map((e) => e.type)).toEqual(["grouped-a", "grouped-b"]);
    expect(results.every((e) => e.dataKey === "group-1")).toBe(true);
  });

  it("accepts a pre-built catalog to avoid redundant builds", () => {
    const catalog: WidgetCatalogEntry[] = [
      entry("a", "my-group"),
      entry("b", "my-group"),
      entry("c"),
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
      for (const e of entries) {
        expect(e.dataKey).toBe(key);
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
      entry("x", "shared"),
      entry("y", "shared"),
      entry("z", "other"),
    ];
    const groups = getDataKeyGroups(catalog);
    expect(groups.get("shared")).toHaveLength(2);
    expect(groups.get("other")).toHaveLength(1);
  });

  it("returns an empty map for a catalog with no data keys", () => {
    const catalog: WidgetCatalogEntry[] = [
      entry("p"),
      entry("q"),
    ];
    const groups = getDataKeyGroups(catalog);
    expect(groups.size).toBe(0);
  });

  it("accepts a pre-built catalog to avoid redundant builds", () => {
    const catalog: WidgetCatalogEntry[] = [
      entry("a", "g1"),
      entry("b", "g2"),
    ];
    const groups = getDataKeyGroups(catalog);
    expect(groups.size).toBe(2);
    expect(groups.has("g1")).toBe(true);
    expect(groups.has("g2")).toBe(true);
  });
});
