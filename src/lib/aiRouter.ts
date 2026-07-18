/**
 * FILE: src/lib/aiRouter.ts
 *
 * AI Router with Gemini native function calling.
 *
 * HARD ARCHITECTURAL RULE:
 *   - NEVER call response.text() on a routing response.
 *   - ONLY use response.functionCalls to extract structured routing decisions.
 *   - Regex on Gemini text output is PROHIBITED — it breaks on any phrasing change.
 *
 * Execution order per query:
 *   1. Session cache check (5-min TTL)
 *   2. Local intent matcher (< 100ms path for high-confidence queries)
 *   3. Build enriched system prompt (RAG context + few-shot corrections)
 *   4. Gemini API call (flash for single, pro for multi-tool)
 *   5. Extract via response.functionCalls() ONLY
 *   6. Validate all toolIds against registry
 *   7. Build fuzzy fallback results (always computed)
 *   8. Cache and return
 */

import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import type { FunctionDeclaration } from "@google/genai";
import { type ToolConfig, toolsRegistry, getToolById } from "./toolsRegistry";
import { matchLocalIntent } from "./intentMatcher";
import { retrieveRelevantContext, getUserPreferences, buildContextPrompt } from "./ragEngine";
import { buildFewShotExamples } from "./feedbackEngine";

// ── Gemini client ─────────────────────────────────────────────────────────────
const GENAI_API_KEY: string = (import.meta.env.VITE_GEMINI_API_KEY as string) ?? "";
const ai = new GoogleGenAI({ apiKey: GENAI_API_KEY });

// ── Result types ──────────────────────────────────────────────────────────────

export type ToolMatch = {
  toolId: string;
  tool: ToolConfig;
  prefillData: Record<string, string | number | boolean>;
  executionOrder: number;
  dependsOnToolId: string | null;
};

export type RouterResult = {
  mode: "single" | "multi" | "uncertain" | "fallback";
  primaryTool: ToolMatch | null;
  additionalTools: ToolMatch[];
  /** Top 5 fuzzy keyword matches — always populated for fallback grid display */
  fallbackResults: ToolConfig[];
  confidence: number;
  /** Shown in the reasoning trace UI */
  reasoning: string;
  workflowDescription: string | null;
  clarificationNeeded: boolean;
  clarificationQuestion: string | null;
  suggestedAlternatives: ToolConfig[];
  source: "local" | "gemini" | "fuzzy" | "cache";
  processingTimeMs: number;
};

// ── Cache helpers ─────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedEntry {
  result: RouterResult;
  timestamp: number;
}

function makeCacheKey(query: string): string {
  try {
    return btoa(encodeURIComponent(query.trim().toLowerCase()));
  } catch {
    return query.trim().toLowerCase().slice(0, 64);
  }
}

function getCachedResult(key: string): RouterResult | null {
  try {
    const raw = sessionStorage.getItem(`ar:${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedEntry;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(`ar:${key}`);
      return null;
    }
    return entry.result;
  } catch {
    return null;
  }
}

function setCachedResult(key: string, result: RouterResult): void {
  try {
    const entry: CachedEntry = { result, timestamp: Date.now() };
    sessionStorage.setItem(`ar:${key}`, JSON.stringify(entry));
  } catch {
    // sessionStorage quota exceeded — silent fail, routing still works
  }
}

/** Invalidate a cached result (called by feedbackEngine after a correction). */
export function invalidateCacheForQuery(query: string): void {
  const key = makeCacheKey(query);
  try {
    sessionStorage.removeItem(`ar:${key}`);
  } catch {
    // ignore
  }
}

// ── Gemini function declarations ──────────────────────────────────────────────

// Cast via unknown to reconcile the plain-object structure with the SDK's
// strict FunctionDeclaration generic type without resorting to `any`.
const routerFunctionDeclarations = ([
  {
    name: "selectSingleTool",
    description: "Select one tool when the query has a single clear intent.",
    parameters: {
      type: "OBJECT",
      properties: {
        toolId: {
          type: "STRING",
          description:
            "Exact tool id from the registry (camelCase), or null if no suitable tool found."
        },
        prefillData: {
          type: "OBJECT",
          description:
            "Extracted parameters whose keys match the tool inputSchema keys exactly. Use empty object if no params to prefill."
        },
        confidence: {
          type: "NUMBER",
          description: "Confidence score 0 to 1. Use < 0.6 if unsure."
        },
        reasoning: {
          type: "STRING",
          description: "One sentence: why this tool was selected for this query."
        },
        alternativeToolIds: {
          type: "ARRAY",
          items: { type: "STRING" },
          description:
            "Up to 2 fallback tool IDs when confidence is below 0.8. Omit if not needed."
        }
      },
      required: ["toolId", "confidence", "reasoning"]
    }
  },
  {
    name: "selectMultipleTools",
    description:
      "Select multiple tools when the query clearly needs chained or parallel execution. Example: 'calculate my BMI and give me a calorie plan'.",
    parameters: {
      type: "OBJECT",
      properties: {
        tools: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              toolId: { type: "STRING" },
              prefillData: { type: "OBJECT" },
              executionOrder: {
                type: "NUMBER",
                description:
                  "1-indexed. Tools with the same order run in parallel. Different orders run sequentially."
              },
              dependsOnToolId: {
                type: "STRING",
                description:
                  "Tool ID whose output feeds into this tool's input. Omit if not sequential."
              }
            },
            required: ["toolId", "executionOrder"]
          }
        },
        workflowDescription: {
          type: "STRING",
          description:
            "Plain English summary of what the combined workflow accomplishes."
        }
      },
      required: ["tools", "workflowDescription"]
    }
  },
  {
    name: "requestClarification",
    description:
      "Use when the query is too ambiguous to route with confidence >= 0.6. Ask the user one clarifying question.",
    parameters: {
      type: "OBJECT",
      properties: {
        question: {
          type: "STRING",
          description: "A short, clear clarifying question for the user."
        },
        suggestedToolIds: {
          type: "ARRAY",
          items: { type: "STRING" },
          description:
            "2–4 plausible tool IDs for the user to choose from. Shown as quick-pick chips."
        }
      },
      required: ["question", "suggestedToolIds"]
    }
  }
] as unknown[]) as FunctionDeclaration[];

// ── Type guards for Gemini function call args ─────────────────────────────────

function isString(v: unknown): v is string {
  return typeof v === "string";
}
function isNumber(v: unknown): v is number {
  return typeof v === "number";
}
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isString);
}
function isObjectArray(v: unknown): v is Record<string, unknown>[] {
  return Array.isArray(v) && v.every(isRecord);
}

/** Safely reads a prefillData object, discarding non-primitive values. */
function sanitisePrefill(
  raw: unknown
): Record<string, string | number | boolean> {
  if (!isRecord(raw)) return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    }
  }
  return out;
}

// ── Fuzzy fallback ────────────────────────────────────────────────────────────

/**
 * Scores every tool by keyword/name/description overlap with the query.
 * Returns sorted results, most relevant first.
 */
export function computeFuzzyFallback(query: string, limit = 5): ToolConfig[] {
  const qWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2);

  if (qWords.length === 0) return toolsRegistry.slice(0, limit);

  return toolsRegistry
    .map(tool => {
      const searchable =
        tool.keywords.join(" ").toLowerCase() +
        " " +
        tool.name.toLowerCase() +
        " " +
        tool.description.toLowerCase();
      const score = qWords.reduce(
        (acc, w) => acc + (searchable.includes(w) ? 1 : 0),
        0
      );
      return { tool, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ tool }) => tool);
}

// ── Fallback RouterResult builder ─────────────────────────────────────────────

function buildFallbackResult(
  query: string,
  startTime: number,
  reasoning = "Unable to determine intent — showing relevant tools."
): RouterResult {
  return {
    mode: "fallback",
    primaryTool: null,
    additionalTools: [],
    fallbackResults: computeFuzzyFallback(query, 5),
    confidence: 0,
    reasoning,
    workflowDescription: null,
    clarificationNeeded: false,
    clarificationQuestion: null,
    suggestedAlternatives: [],
    source: "fuzzy",
    processingTimeMs: Date.now() - startTime
  };
}

// ── Multi-tool complexity detector ────────────────────────────────────────────

const MULTI_TOOL_SIGNALS = /\b(?:and|then|also|after|plus|as well as|followed by)\b/i;

function isMultiToolQuery(query: string): boolean {
  return MULTI_TOOL_SIGNALS.test(query);
}

// ── System prompt builder ─────────────────────────────────────────────────────

async function buildSystemPrompt(query: string): Promise<string> {
  // Fetch RAG context and few-shot examples in parallel — errors are non-fatal
  const [memories, preferences, fewShots] = await Promise.all([
    retrieveRelevantContext(query, 5).catch((): ReturnType<typeof retrieveRelevantContext> => Promise.resolve([])),
    getUserPreferences().catch((): ReturnType<typeof getUserPreferences> => Promise.resolve([])),
    buildFewShotExamples(5).catch(() => "")
  ]);

  const contextBlock = buildContextPrompt(query, memories, preferences);

  // Compact registry — only id, keywords, and inputSchema to stay under token limit
  const compactRegistry = toolsRegistry.map(t => ({
    id: t.id,
    name: t.name,
    category: t.category,
    keywords: t.keywords,
    inputSchema: t.inputSchema
  }));

  return `You are a tool router for Toolkit, a mobile utility app with 67 tools.

${contextBlock}

${fewShots ? fewShots + "\n" : ""}TOOL REGISTRY (id, name, category, keywords, inputSchema):
${JSON.stringify(compactRegistry, null, 0)}

ROUTING RULES:
- Call selectSingleTool for queries with one clear intent.
- Call selectMultipleTools ONLY when the query explicitly needs 2+ different tools.
- Call requestClarification when intent is genuinely ambiguous and confidence would be < 0.6.
- prefillData keys MUST exactly match the tool's inputSchema keys shown above.
- NEVER invent a toolId — use null if no tool matches.
- Confidence < 0.6 → prefer requestClarification over a wrong selectSingleTool.`;
}

// ── Core Gemini API call with retry ──────────────────────────────────────────

const RETRY_DELAYS_MS = [500, 1000, 2000];

interface FunctionCallResult {
  name: string;
  args: Record<string, unknown>;
}

async function callGeminiWithRetry(
  prompt: string,
  model: "gemini-2.5-flash" | "gemini-2.5-pro",
  attempt = 0
): Promise<FunctionCallResult | null> {
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ functionDeclarations: routerFunctionDeclarations }],
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingConfigMode.ANY }
        }
      }
    });

    // HARD RULE: ONLY use functionCalls. Never response.text().
    const calls = response.functionCalls;
    if (!calls || calls.length === 0) return null;

    const call = calls[0];
    const name = call.name;
    const args = call.args;

    if (!isString(name) || !isRecord(args)) return null;
    return { name, args };
  } catch (err: unknown) {
    if (attempt < RETRY_DELAYS_MS.length) {
      await new Promise(resolve =>
        setTimeout(resolve, RETRY_DELAYS_MS[attempt])
      );
      return callGeminiWithRetry(prompt, model, attempt + 1);
    }
    // All retries exhausted — caller handles null gracefully
    return null;
  }
}

// ── Result builders ───────────────────────────────────────────────────────────

function buildToolMatch(
  toolId: string,
  prefillRaw: unknown,
  executionOrder: number,
  dependsOnToolId: string | null
): ToolMatch | null {
  const tool = getToolById(toolId);
  if (!tool) return null;
  return {
    toolId,
    tool,
    prefillData: sanitisePrefill(prefillRaw),
    executionOrder,
    dependsOnToolId
  };
}

function handleSelectSingleTool(
  args: Record<string, unknown>,
  query: string,
  startTime: number
): RouterResult {
  const toolId         = isString(args["toolId"]) ? args["toolId"] : null;
  const confidence     = isNumber(args["confidence"]) ? args["confidence"] : 0;
  const reasoning      = isString(args["reasoning"]) ? args["reasoning"] : "";
  const altIds         = isStringArray(args["alternativeToolIds"]) ? args["alternativeToolIds"] : [];
  const prefillRaw     = args["prefillData"] ?? {};

  if (!toolId) {
    return buildFallbackResult(query, startTime, reasoning || "No matching tool found.");
  }

  const primaryMatch = buildToolMatch(toolId, prefillRaw, 1, null);
  if (!primaryMatch) {
    // toolId from Gemini wasn't in registry — demote to fallback
    return buildFallbackResult(
      query,
      startTime,
      `AI suggested unknown tool '${toolId}' — showing similar tools.`
    );
  }

  const alternatives: ToolConfig[] = altIds
    .map(id => getToolById(id))
    .filter((t): t is ToolConfig => t !== undefined);

  return {
    mode: confidence < 0.6 ? "uncertain" : "single",
    primaryTool: primaryMatch,
    additionalTools: [],
    fallbackResults: computeFuzzyFallback(query, 5),
    confidence,
    reasoning,
    workflowDescription: null,
    clarificationNeeded: confidence < 0.6,
    clarificationQuestion: null,
    suggestedAlternatives: alternatives,
    source: "gemini",
    processingTimeMs: Date.now() - startTime
  };
}

function handleSelectMultipleTools(
  args: Record<string, unknown>,
  query: string,
  startTime: number,
  maxTools: number
): RouterResult {
  const toolsRaw          = isObjectArray(args["tools"]) ? args["tools"] : [];
  const workflowDesc      = isString(args["workflowDescription"])
    ? args["workflowDescription"]
    : "Multi-tool workflow";

  const matches: ToolMatch[] = toolsRaw
    .sort((a, b) => {
      const oA = isNumber(a["executionOrder"]) ? a["executionOrder"] : 999;
      const oB = isNumber(b["executionOrder"]) ? b["executionOrder"] : 999;
      return oA - oB;
    })
    .slice(0, maxTools)
    .reduce<ToolMatch[]>((acc, t) => {
      const id     = isString(t["toolId"]) ? t["toolId"] : null;
      const order  = isNumber(t["executionOrder"]) ? t["executionOrder"] : 1;
      const depId  = isString(t["dependsOnToolId"]) ? t["dependsOnToolId"] : null;
      if (!id) return acc;
      const match = buildToolMatch(id, t["prefillData"], order, depId);
      if (match) acc.push(match);
      return acc;
    }, []);

  if (matches.length === 0) {
    return buildFallbackResult(query, startTime, "No valid tools in multi-tool response.");
  }

  const [primary, ...additional] = matches;
  return {
    mode: "multi",
    primaryTool: primary,
    additionalTools: additional,
    fallbackResults: computeFuzzyFallback(query, 5),
    confidence: 0.9,
    reasoning: workflowDesc,
    workflowDescription: workflowDesc,
    clarificationNeeded: false,
    clarificationQuestion: null,
    suggestedAlternatives: [],
    source: "gemini",
    processingTimeMs: Date.now() - startTime
  };
}

function handleRequestClarification(
  args: Record<string, unknown>,
  query: string,
  startTime: number
): RouterResult {
  const question     = isString(args["question"]) ? args["question"] : "Which tool are you looking for?";
  const suggestedIds = isStringArray(args["suggestedToolIds"]) ? args["suggestedToolIds"] : [];

  const alternatives: ToolConfig[] = suggestedIds
    .map(id => getToolById(id))
    .filter((t): t is ToolConfig => t !== undefined)
    .slice(0, 4);

  return {
    mode: "uncertain",
    primaryTool: null,
    additionalTools: [],
    fallbackResults: computeFuzzyFallback(query, 5),
    confidence: 0,
    reasoning: `Clarification needed: ${question}`,
    workflowDescription: null,
    clarificationNeeded: true,
    clarificationQuestion: question,
    suggestedAlternatives: alternatives,
    source: "gemini",
    processingTimeMs: Date.now() - startTime
  };
}

// ── Main router ───────────────────────────────────────────────────────────────

/**
 * Routes a natural language query to the most relevant Toolkit tool(s).
 *
 * Execution path priority:
 *   cache → local matcher → gemini → fuzzy fallback
 *
 * Never throws. Always returns a RouterResult.
 */
export async function routeQuery(
  userQuery: string,
  options?: {
    allowMultiTool?: boolean;
    maxTools?: number;
    forceGemini?: boolean;
    mediaContext?: {
      type: "image" | "document";
      base64Content: string;
      mimeType: string;
    };
  }
): Promise<RouterResult> {
  const startTime = Date.now();
  const {
    allowMultiTool = true,
    maxTools = 3,
    forceGemini = false
  } = options ?? {};

  const query = userQuery.trim();
  if (!query) return buildFallbackResult(query, startTime, "Empty query.");

  // ── SPECIAL MULTI-TOOL LOCAL SHORT-CIRCUITS ───────────────────────────────
  const qLower = query.toLowerCase();

  // ── SUGGESTED PROMPTS DIRECT SHORT-CIRCUITS ────────────────────────────────
  if (qLower === "track my bmi metrics" || qLower.includes("bmi metrics")) {
    const tool = getToolById("bmiCalculator");
    if (tool) {
      return {
        mode: "single",
        primaryTool: { toolId: tool.id, tool, prefillData: { weight: 70, height: 175, unit: "metric" }, executionOrder: 1, dependsOnToolId: null },
        additionalTools: [],
        fallbackResults: [],
        confidence: 0.99,
        reasoning: "Suggested prompt: Track my BMI metrics",
        workflowDescription: null,
        clarificationNeeded: false,
        clarificationQuestion: null,
        suggestedAlternatives: [],
        source: "local",
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  if (qLower === "check london time offsets" || qLower.includes("london time")) {
    const tool = getToolById("timeZone");
    if (tool) {
      return {
        mode: "single",
        primaryTool: { toolId: tool.id, tool, prefillData: { query: "London" }, executionOrder: 1, dependsOnToolId: null },
        additionalTools: [],
        fallbackResults: [],
        confidence: 0.99,
        reasoning: "Suggested prompt: Check London time offsets",
        workflowDescription: null,
        clarificationNeeded: false,
        clarificationQuestion: null,
        suggestedAlternatives: [],
        source: "local",
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  if (qLower === "configure audio noise tracking parameters" || qLower.includes("audio noise tracking")) {
    const tool = getToolById("noiseDetector");
    if (tool) {
      return {
        mode: "single",
        primaryTool: { toolId: tool.id, tool, prefillData: {}, executionOrder: 1, dependsOnToolId: null },
        additionalTools: [],
        fallbackResults: [],
        confidence: 0.99,
        reasoning: "Suggested prompt: Configure audio noise tracking parameters",
        workflowDescription: null,
        clarificationNeeded: false,
        clarificationQuestion: null,
        suggestedAlternatives: [],
        source: "local",
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  if (qLower === "clean phone speaker and check battery" || qLower.includes("clean phone speaker")) {
    const cleanTool = getToolById("speakerCleaner");
    const batteryTool = getToolById("battery");
    if (cleanTool && batteryTool) {
      return {
        mode: "multi",
        primaryTool: { toolId: cleanTool.id, tool: cleanTool, prefillData: {}, executionOrder: 1, dependsOnToolId: null },
        additionalTools: [
          { toolId: batteryTool.id, tool: batteryTool, prefillData: {}, executionOrder: 1, dependsOnToolId: null }
        ],
        fallbackResults: [],
        confidence: 0.99,
        reasoning: "Suggested prompt: Clean phone speaker and check battery",
        workflowDescription: "Speaker Cleaning and Battery Status Workspace",
        clarificationNeeded: false,
        clarificationQuestion: null,
        suggestedAlternatives: [],
        source: "local",
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  if (qLower === "find colours from image and compress it" || qLower.includes("colours from image")) {
    const colorTool = getToolById("color-picker");
    const compressTool = getToolById("imageCompressor");
    if (colorTool && compressTool) {
      return {
        mode: "multi",
        primaryTool: { toolId: colorTool.id, tool: colorTool, prefillData: {}, executionOrder: 1, dependsOnToolId: null },
        additionalTools: [
          { toolId: compressTool.id, tool: compressTool, prefillData: { quality: 80 }, executionOrder: 1, dependsOnToolId: null }
        ],
        fallbackResults: [],
        confidence: 0.99,
        reasoning: "Suggested prompt: Find colours from image and compress it",
        workflowDescription: "Color Extractor and Image Compressor Workspace",
        clarificationNeeded: false,
        clarificationQuestion: null,
        suggestedAlternatives: [],
        source: "local",
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  if (qLower === "check my reaction time and play memory card game" || qLower.includes("reaction time and play memory")) {
    const reactionTool = getToolById("brainReaction");
    const memoryTool = getToolById("memoryCard");
    if (reactionTool && memoryTool) {
      return {
        mode: "multi",
        primaryTool: { toolId: reactionTool.id, tool: reactionTool, prefillData: {}, executionOrder: 1, dependsOnToolId: null },
        additionalTools: [
          { toolId: memoryTool.id, tool: memoryTool, prefillData: {}, executionOrder: 1, dependsOnToolId: null }
        ],
        fallbackResults: [],
        confidence: 0.99,
        reasoning: "Suggested prompt: Check reaction time and play memory card game",
        workflowDescription: "Brain Speed and Memory Workspace",
        clarificationNeeded: false,
        clarificationQuestion: null,
        suggestedAlternatives: [],
        source: "local",
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  if (qLower === "measure magnetic metal field" || qLower.includes("magnetic metal field")) {
    const tool = getToolById("metalDetector");
    if (tool) {
      return {
        mode: "single",
        primaryTool: { toolId: tool.id, tool, prefillData: {}, executionOrder: 1, dependsOnToolId: null },
        additionalTools: [],
        fallbackResults: [],
        confidence: 0.99,
        reasoning: "Suggested prompt: Measure magnetic metal field",
        workflowDescription: null,
        clarificationNeeded: false,
        clarificationQuestion: null,
        suggestedAlternatives: [],
        source: "local",
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  if (qLower === "decrypt secure text ciphers" || qLower.includes("secure text ciphers")) {
    const tool = getToolById("textEncrypt");
    if (tool) {
      return {
        mode: "single",
        primaryTool: { toolId: tool.id, tool, prefillData: { mode: "decrypt" }, executionOrder: 1, dependsOnToolId: null },
        additionalTools: [],
        fallbackResults: [],
        confidence: 0.99,
        reasoning: "Suggested prompt: Decrypt secure text ciphers",
        workflowDescription: null,
        clarificationNeeded: false,
        clarificationQuestion: null,
        suggestedAlternatives: [],
        source: "local",
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  if (qLower === "bmi and water intake" || qLower === "bmi and water" || qLower === "bmi and water intake metrics") {
    const bmiTool = getToolById("bmiCalculator");
    const hydraTool = getToolById("hydrationPro");
    if (bmiTool && hydraTool) {
      const result: RouterResult = {
        mode: "multi",
        primaryTool: {
          toolId: bmiTool.id,
          tool: bmiTool,
          prefillData: {},
          executionOrder: 1,
          dependsOnToolId: null
        },
        additionalTools: [
          {
            toolId: hydraTool.id,
            tool: hydraTool,
            prefillData: {},
            executionOrder: 1,
            dependsOnToolId: null
          }
        ],
        fallbackResults: [],
        confidence: 0.98,
        reasoning: "Local multi-tool short-circuit: BMI + Hydration",
        workflowDescription: "BMI and Hydration Tracker Workspace",
        clarificationNeeded: false,
        clarificationQuestion: null,
        suggestedAlternatives: [],
        source: "local",
        processingTimeMs: Date.now() - startTime
      };
      return result;
    }
  }

  if (qLower === "check storage and battery" || qLower === "check storage and battery status" || qLower.includes("storage and battery")) {
    const storageTool = getToolById("storage");
    const batteryTool = getToolById("battery");
    if (storageTool && batteryTool) {
      const result: RouterResult = {
        mode: "multi",
        primaryTool: {
          toolId: storageTool.id,
          tool: storageTool,
          prefillData: {},
          executionOrder: 1,
          dependsOnToolId: null
        },
        additionalTools: [
          {
            toolId: batteryTool.id,
            tool: batteryTool,
            prefillData: {},
            executionOrder: 1,
            dependsOnToolId: null
          }
        ],
        fallbackResults: [],
        confidence: 0.98,
        reasoning: "Local multi-tool short-circuit: Storage + Battery",
        workflowDescription: "Storage and Battery Status Workspace",
        clarificationNeeded: false,
        clarificationQuestion: null,
        suggestedAlternatives: [],
        source: "local",
        processingTimeMs: Date.now() - startTime
      };
      return result;
    }
  }

  // ── STEP 1: Session cache check ───────────────────────────────────────────
  const cacheKey = makeCacheKey(query);
  const cached   = getCachedResult(cacheKey);
  if (cached) {
    return {
      ...cached,
      source: "cache",
      processingTimeMs: Date.now() - startTime
    };
  }

  // ── STEP 2: Local intent match (< 100ms path) ─────────────────────────────
  if (!forceGemini) {
    const localMatch = matchLocalIntent(query);
    if (localMatch && localMatch.confidence >= 0.85) {
      const tool = getToolById(localMatch.toolId);
      if (tool) {
        const result: RouterResult = {
          mode: "single",
          primaryTool: {
            toolId: tool.id,
            tool,
            prefillData: localMatch.prefillData,
            executionOrder: 1,
            dependsOnToolId: null
          },
          additionalTools: [],
          fallbackResults: [],
          confidence: localMatch.confidence,
          reasoning: `Local pattern matched: ${localMatch.matchedPattern}`,
          workflowDescription: null,
          clarificationNeeded: false,
          clarificationQuestion: null,
          suggestedAlternatives: [],
          source: "local",
          processingTimeMs: Date.now() - startTime
        };
        setCachedResult(cacheKey, result);
        return result;
      }
    }
  }

  // ── STEP 3: Build enriched system prompt ──────────────────────────────────
  let systemPrompt: string;
  try {
    systemPrompt = await buildSystemPrompt(query);
  } catch {
    systemPrompt = `You are a tool router for Toolkit. Route this query to the best tool.\n\nAvailable tool IDs: ${toolsRegistry.map(t => t.id).join(", ")}\n\nQuery: "${query}"`;
  }

  // Append media context if provided
  const fullPrompt = options?.mediaContext
    ? `${systemPrompt}\n\nMedia context: The user has uploaded a ${options.mediaContext.type}.\n\nUser query: "${query}"`
    : `${systemPrompt}\n\nUser query: "${query}"`;

  // ── STEP 4: Gemini API call ───────────────────────────────────────────────
  // Use pro for multi-tool queries (conjunctions detected), flash for single
  const multiSignal = allowMultiTool && isMultiToolQuery(query);
  const model = multiSignal
    ? ("gemini-2.5-pro"  as const)
    : ("gemini-2.5-flash" as const);

  const callResult = await callGeminiWithRetry(fullPrompt, model);

  // ── STEP 5: Extract function call result ──────────────────────────────────
  // HARD RULE: Only functionCalls(). Never text().
  if (!callResult) {
    const fallback = buildFallbackResult(query, startTime, "AI router returned no function call — showing top matches.");
    setCachedResult(cacheKey, fallback);
    return fallback;
  }

  // ── STEP 6 + 7: Validate toolIds and build result ────────────────────────
  let result: RouterResult;

  switch (callResult.name) {
    case "selectSingleTool":
      result = handleSelectSingleTool(callResult.args, query, startTime);
      break;

    case "selectMultipleTools":
      if (!allowMultiTool) {
        // Multi-tool disabled by caller — extract first tool only as single
        const tools = isObjectArray(callResult.args["tools"])
          ? callResult.args["tools"]
          : [];
        const first = tools[0];
        if (first && isString(first["toolId"])) {
          result = handleSelectSingleTool(
            {
              toolId: first["toolId"],
              prefillData: first["prefillData"] ?? {},
              confidence: 0.8,
              reasoning: "First tool of multi-tool query (multi-tool disabled)"
            },
            query,
            startTime
          );
        } else {
          result = buildFallbackResult(query, startTime);
        }
      } else {
        result = handleSelectMultipleTools(callResult.args, query, startTime, maxTools);
      }
      break;

    case "requestClarification":
      result = handleRequestClarification(callResult.args, query, startTime);
      break;

    default:
      result = buildFallbackResult(
        query,
        startTime,
        `Unknown function call '${callResult.name}' — showing relevant tools.`
      );
  }

  // Fallback results are always recomputed to guarantee freshness
  if (result.fallbackResults.length === 0) {
    result = { ...result, fallbackResults: computeFuzzyFallback(query, 5) };
  }

  // ── STEP 8: Cache and return ──────────────────────────────────────────────
  setCachedResult(cacheKey, result);
  return result;
}
