/**
 * FILE: src/__tests__/toolsRegistry.test.ts
 *
 * Unit tests for the tools registry (Phase 1).
 * Validates integrity of all tool definitions.
 *
 * Run: npx vitest run src/__tests__/toolsRegistry.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  getAllTools,
  getToolById,
  getToolsByCategory,
  searchTools,
  CATEGORIES,
  type ToolConfig
} from "../lib/toolsRegistry";

describe("toolsRegistry — integrity", () => {
  const tools = getAllTools();

  it("exports at least 30 tools", () => {
    expect(tools.length).toBeGreaterThanOrEqual(30);
  });

  it("every tool has a non-empty id", () => {
    const missing = tools.filter(t => !t.id || t.id.trim().length === 0);
    expect(missing, `Tools missing id: ${missing.map(t => t.name).join(", ")}`).toHaveLength(0);
  });

  it("every tool has a non-empty name", () => {
    const missing = tools.filter(t => !t.name || t.name.trim().length === 0);
    expect(missing).toHaveLength(0);
  });

  it("every tool has a description", () => {
    const missing = tools.filter(t => !t.description || t.description.trim().length === 0);
    expect(missing, `Tools missing description: ${missing.map(t => t.id).join(", ")}`).toHaveLength(0);
  });

  it("every tool has a valid route path starting with /tools/", () => {
    const invalid = tools.filter(t => !t.route || !t.route.startsWith("/tools/"));
    expect(invalid, `Invalid routes: ${invalid.map(t => `${t.id} → ${t.route}`).join(", ")}`).toHaveLength(0);
  });

  it("every tool has at least 1 keyword", () => {
    const invalid = tools.filter(t => !t.keywords || t.keywords.length === 0);
    expect(invalid, `Tools with no keywords: ${invalid.map(t => t.id).join(", ")}`).toHaveLength(0);
  });

  it("tool IDs are unique", () => {
    const ids = tools.map(t => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("every tool belongs to a known category", () => {
    const categoryIds = CATEGORIES.map(c => c.id);
    const invalid = tools.filter(t => !categoryIds.includes(t.category));
    expect(invalid, `Tools with unknown category: ${invalid.map(t => `${t.id} → ${t.category}`).join(", ")}`).toHaveLength(0);
  });
});

describe("toolsRegistry — getToolById", () => {
  it("returns tool for a known id", () => {
    const tool = getToolById("calculator");
    expect(tool).not.toBeUndefined();
    expect(tool!.id).toBe("calculator");
  });

  it("returns undefined for unknown id", () => {
    const tool = getToolById("nonexistent-tool-xyz");
    expect(tool).toBeUndefined();
  });

  it("returns correct name for stopwatch", () => {
    const tool = getToolById("stopwatch");
    expect(tool).not.toBeUndefined();
    expect(tool!.name.toLowerCase()).toContain("stopwatch");
  });
});

describe("toolsRegistry — getToolsByCategory", () => {
  it("returns tools for 'calculative' category", () => {
    const calc = getToolsByCategory("calculative");
    expect(calc.length).toBeGreaterThan(0);
    calc.forEach((t: ToolConfig) => expect(t.category).toBe("calculative"));
  });

  it("returns empty array for unknown category", () => {
    const none = getToolsByCategory("doesnotexist" as any);
    expect(none).toHaveLength(0);
  });

  it("all returned tools have the queried category", () => {
    const timeTools = getToolsByCategory("timeanddate");
    expect(timeTools.length).toBeGreaterThan(0);
    timeTools.forEach(t => expect(t.category).toBe("timeanddate"));
  });
});

describe("toolsRegistry — searchTools", () => {
  it("finds calculator by keyword 'math'", () => {
    const results = searchTools("math");
    expect(results.length).toBeGreaterThan(0);
    const ids = results.map(t => t.id);
    expect(ids).toContain("calculator");
  });

  it("finds weather tool by 'forecast'", () => {
    const results = searchTools("forecast");
    const ids = results.map(t => t.id);
    expect(ids).toContain("weather");
  });

  it("returns empty array for nonsense query", () => {
    const results = searchTools("xyzzy_foobar_nonexistent");
    expect(results).toHaveLength(0);
  });

  it("search is case-insensitive", () => {
    const lower = searchTools("calculator");
    const upper = searchTools("CALCULATOR");
    expect(lower.length).toBe(upper.length);
  });
});
