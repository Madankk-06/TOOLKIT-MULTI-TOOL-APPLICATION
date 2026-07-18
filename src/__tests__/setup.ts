/**
 * FILE: src/__tests__/setup.ts
 * Vitest global test setup — runs before every test file.
 */

// jsdom doesn't have indexedDB — use fake-indexeddb
import "fake-indexeddb/auto";
import { beforeAll, afterAll } from "vitest";

// Suppress console.error/warn noise in tests unless explicitly tested
const originalError = console.error.bind(console);
const originalWarn  = console.warn.bind(console);

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("[Toolkit]")) return;
    originalError(...args);
  };
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("[SW]")) return;
    originalWarn(...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn  = originalWarn;
});
