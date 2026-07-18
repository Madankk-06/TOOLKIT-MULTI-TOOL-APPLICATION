/**
 * FILE: src/__tests__/intentMatcher.test.ts
 *
 * Unit tests for the local intent matcher (Phase 2).
 * Uses the "shouldFail + expectedBehavior" style per user spec (Option C).
 *
 * Run: npx vitest run src/__tests__/intentMatcher.test.ts
 */

import { describe, it, expect } from "vitest";
import { matchIntent, type IntentResult } from "../lib/intentMatcher";

// ── Helpers ───────────────────────────────────────────────────────────────────

function expectToolMatch(query: string, expectedToolId: string) {
  const result = matchIntent(query);
  expect(result, `Query "${query}" should match "${expectedToolId}"`).not.toBeNull();
  expect(result!.toolId).toBe(expectedToolId);
  expect(result!.confidence).toBeGreaterThanOrEqual(0.7);
}

function expectNoMatch(query: string) {
  const result = matchIntent(query);
  const shouldFail = result !== null;
  if (shouldFail) {
    console.warn(
      `expectedBehavior: "${query}" should NOT match, but matched "${result!.toolId}" ` +
      `(confidence: ${result!.confidence})`
    );
  }
  expect(result, `Query "${query}" should return null`).toBeNull();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("intentMatcher — tool routing", () => {
  // ── Timer (4 patterns) ─────────────────────────────────────────────────────
  it("routes 'set a 5 minute timer' to timer", () => {
    expectToolMatch("set a 5 minute timer", "timer");
    const result = matchIntent("set a 5 minute timer");
    expect(result!.prefillData?.duration).toBe(300);
  });

  it("routes '2hr and 30min timer' to timer", () => {
    expectToolMatch("2hr and 30min timer", "timer");
    const result = matchIntent("2hr and 30min timer");
    expect(result!.prefillData?.duration).toBe(9000);
  });

  it("routes 'remind me in 10 minutes' to timer", () => {
    expectToolMatch("remind me in 10 minutes", "timer");
    const result = matchIntent("remind me in 10 minutes");
    expect(result!.prefillData?.duration).toBe(600);
  });

  it("routes '45 second timer' to timer", () => {
    expectToolMatch("45 second timer", "timer");
    const result = matchIntent("45 second timer");
    expect(result!.prefillData?.duration).toBe(45);
  });

  // ── BMI (3 patterns) ───────────────────────────────────────────────────────
  it("routes 'weight 70kg height 175cm' to bmiCalculator", () => {
    expectToolMatch("weight 70kg height 175cm", "bmiCalculator");
    const result = matchIntent("weight 70kg height 175cm");
    expect(result!.prefillData?.weight).toBe(70);
    expect(result!.prefillData?.height).toBe(175);
    expect(result!.prefillData?.unit).toBe("metric");
  });

  it("routes 'bmi for 70kg 175cm' to bmiCalculator", () => {
    expectToolMatch("bmi for 70kg 175cm", "bmiCalculator");
    const result = matchIntent("bmi for 70kg 175cm");
    expect(result!.prefillData?.weight).toBe(70);
    expect(result!.prefillData?.height).toBe(175);
  });

  it("routes 'calculate my bmi' to bmiCalculator", () => {
    expectToolMatch("calculate my bmi", "bmiCalculator");
    const result = matchIntent("calculate my bmi");
    expect(result!.prefillData).toEqual({});
  });

  // ── Unit Converter (3 patterns) ────────────────────────────────────────────
  it("routes 'convert 100 km to miles' to unitConverter", () => {
    expectToolMatch("convert 100 km to miles", "unitConverter");
    const result = matchIntent("convert 100 km to miles");
    expect(result!.prefillData?.value).toBe(100);
    expect(result!.prefillData?.fromUnit).toBe("km");
    expect(result!.prefillData?.toUnit).toBe("miles");
  });

  it("routes '100 km in miles' to unitConverter", () => {
    expectToolMatch("100 km in miles", "unitConverter");
    const result = matchIntent("100 km in miles");
    expect(result!.prefillData?.value).toBe(100);
    expect(result!.prefillData?.fromUnit).toBe("km");
    expect(result!.prefillData?.toUnit).toBe("miles");
  });

  it("routes 'how many miles in 100 km' to unitConverter", () => {
    expectToolMatch("how many miles in 100 km", "unitConverter");
    const result = matchIntent("how many miles in 100 km");
    expect(result!.prefillData?.value).toBe(100);
    expect(result!.prefillData?.fromUnit).toBe("km");
    expect(result!.prefillData?.toUnit).toBe("miles");
  });

  // ── Translator (3 patterns) ────────────────────────────────────────────────
  it("routes 'translate Hello to Tamil' to translator", () => {
    expectToolMatch("translate Hello to Tamil", "translator");
    const result = matchIntent("translate Hello to Tamil");
    expect(result!.prefillData?.text).toBe("Hello");
    expect(result!.prefillData?.targetLanguage).toBe("tamil");
  });

  it("routes 'how do you say thank you in French' to translator", () => {
    expectToolMatch("how do you say thank you in French", "translator");
    const result = matchIntent("how do you say thank you in French");
    expect(result!.prefillData?.text).toBe("thank you");
    expect(result!.prefillData?.targetLanguage).toBe("french");
  });

  it("routes 'good morning in Hindi' to translator", () => {
    expectToolMatch("good morning in Hindi", "translator");
    const result = matchIntent("good morning in Hindi");
    expect(result!.prefillData?.text).toBe("good morning");
    expect(result!.prefillData?.targetLanguage).toBe("hindi");
  });

  // ── Calculator (2 patterns) ────────────────────────────────────────────────
  it("routes 'calculate 12 * (3 + 4)' to calculator", () => {
    expectToolMatch("calculate 12 * (3 + 4)", "calculator");
    const result = matchIntent("calculate 12 * (3 + 4)");
    expect(result!.prefillData?.expression).toBe("12 * (3 + 4)");
  });

  it("routes '12 + 8' to calculator", () => {
    expectToolMatch("12 + 8", "calculator");
    const result = matchIntent("12 + 8");
    expect(result!.prefillData?.expression).toBe("12 + 8");
  });

  // ── QR Generator (2 patterns) ──────────────────────────────────────────────
  it("routes 'generate a QR code for https://example.com' to qrGenerator", () => {
    expectToolMatch("generate a QR code for https://example.com", "qrGenerator");
    const result = matchIntent("generate a QR code for https://example.com");
    expect(result!.prefillData?.content).toBe("https://example.com");
  });

  it("routes 'qr for https://example.com' to qrGenerator", () => {
    expectToolMatch("qr for https://example.com", "qrGenerator");
    const result = matchIntent("qr for https://example.com");
    expect(result!.prefillData?.content).toBe("https://example.com");
  });

  // ── Password Generator (2 patterns) ────────────────────────────────────────
  it("routes 'generate a strong password' to passwordGenerator", () => {
    expectToolMatch("generate a strong password", "passwordGenerator");
    const result = matchIntent("generate a strong password");
    expect(result!.prefillData?.length).toBe(16);
  });

  it("routes 'strong password with 24' to passwordGenerator", () => {
    expectToolMatch("strong password with 24", "passwordGenerator");
    const result = matchIntent("strong password with 24");
    expect(result!.prefillData?.length).toBe(24);
  });

  // ── Weather (2 patterns) ───────────────────────────────────────────────────
  it("routes 'what's the weather in Chennai' to weather", () => {
    expectToolMatch("what's the weather in Chennai", "weather");
    const result = matchIntent("what's the weather in Chennai");
    expect(result!.prefillData?.location).toBe("Chennai");
  });

  it("routes 'temperature in Hyderabad' to weather", () => {
    expectToolMatch("temperature in Hyderabad", "weather");
    const result = matchIntent("temperature in Hyderabad");
    expect(result!.prefillData?.location).toBe("Hyderabad");
  });

  // ── Currency Converter (1 pattern) ─────────────────────────────────────────
  it("routes 'convert 100 USD to INR' to currencyConverter", () => {
    expectToolMatch("convert 100 USD to INR", "currencyConverter");
    const result = matchIntent("convert 100 USD to INR");
    expect(result!.prefillData?.amount).toBe(100);
    expect(result!.prefillData?.fromCurrency).toBe("USD");
    expect(result!.prefillData?.toCurrency).toBe("INR");
  });

  // ── Stopwatch & Clock (2 patterns) ─────────────────────────────────────────
  it("routes 'start stopwatch' to stopwatch", () => {
    expectToolMatch("start stopwatch", "stopwatch");
    const result = matchIntent("start stopwatch");
    expect(result!.prefillData?.action).toBe("start");
  });

  it("routes 'what's the time' to digitalClock", () => {
    expectToolMatch("what's the time", "digitalClock");
  });

  // ── Network Speed (2 patterns) ─────────────────────────────────────────────
  it("routes 'check my internet speed' to networkSpeed", () => {
    expectToolMatch("check my internet speed", "networkSpeed");
  });

  it("routes 'how fast is my internet' to networkSpeed", () => {
    expectToolMatch("how fast is my internet", "networkSpeed");
  });

  // ── Hydration (1 pattern) ──────────────────────────────────────────────────
  it("routes 'I drank 250 ml of water' to hydrationPro", () => {
    expectToolMatch("I drank 250 ml of water", "hydrationPro");
    const result = matchIntent("I drank 250 ml of water");
    expect(result!.prefillData?.amount).toBe(250);
    expect(result!.prefillData?.unit).toBe("ml");
  });

  // ── Nutrition (2 patterns) ─────────────────────────────────────────────────
  it("routes 'how many calories in an apple' to nutritionExpert", () => {
    expectToolMatch("how many calories in an apple", "nutritionExpert");
    const result = matchIntent("how many calories in an apple");
    expect(result!.prefillData?.food).toBe("an apple");
  });

  it("routes 'nutrition facts for banana' to nutritionExpert", () => {
    expectToolMatch("nutrition facts for banana", "nutritionExpert");
    const result = matchIntent("nutrition facts for banana");
    expect(result!.prefillData?.food).toBe("banana");
  });

  // ── No-match cases ─────────────────────────────────────────────────────────
  it("returns null for empty string", () => {
    expectNoMatch("");
  });

  it("returns null for completely unrelated query", () => {
    expectNoMatch("xyzzy foobar baz quux");
  });
});

// ── Confidence & prefill ───────────────────────────────────────────────────────

describe("intentMatcher — confidence and prefill", () => {
  it("returns confidence between 0.7 and 1.0 for strong matches", () => {
    const result: IntentResult | null = matchIntent("start stopwatch");
    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result!.confidence).toBeLessThanOrEqual(1.0);
  });

  it("returns processingTimeMs under 5ms for local match", () => {
    const start  = performance.now();
    matchIntent("what's the time");
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5);
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────────────

describe("intentMatcher — edge cases", () => {
  it("handles UPPERCASE queries", () => {
    const result = matchIntent("OPEN STOPWATCH");
    expect(result).not.toBeNull();
    expect(result!.toolId).toBe("stopwatch");
  });

  it("handles mixed-case queries", () => {
    const result = matchIntent("Weather In Delhi");
    expect(result).not.toBeNull();
    expect(result!.toolId).toBe("weather");
  });

  it("handles extra whitespace", () => {
    const result = matchIntent("  convert   100   USD   to   INR  ");
    expect(result).not.toBeNull();
    expect(result!.toolId).toBe("currencyConverter");
  });

  it("handles trailing punctuation", () => {
    const result = matchIntent("convert 50 USD to INR!");
    expect(result).not.toBeNull();
    expect(result!.toolId).toBe("currencyConverter");
  });
});
