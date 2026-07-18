/**
 * FILE: src/lib/feedbackEngine.ts
 *
 * RLHF (Reinforcement Learning from Human Feedback) self-improving loop.
 *
 * Every time the user picks a different tool than the AI suggested, this engine:
 *   1. Persists the correction to ragEngine's corrections store.
 *   2. Immediately invalidates the stale router cache entry for that query.
 *   3. Makes the correction available as a few-shot example for the next
 *      Gemini prompt — so the same mistake is not repeated.
 *
 * Import contract:
 *   - Imports FROM: ragEngine (storage), toolsRegistry (validation)
 *   - Does NOT import from aiRouter — would create a circular dependency.
 *     Cache invalidation is done inline using the same key algorithm.
 *
 * All public functions: never throw. Errors are caught and logged only.
 */

import {
  recordCorrection,
  getRecentCorrections,
  type CorrectionEntry
} from "./ragEngine";
import { getToolById } from "./toolsRegistry";

// ── Types ─────────────────────────────────────────────────────────────────────

/** A single user correction event. */
export type FeedbackEntry = {
  query: string;
  routerSelectedToolId: string;
  userCorrectedToolId: string;
  timestamp: number;
  usedAsFewShot: boolean;
};

/** Aggregate statistics for the Insights Dashboard. */
export type FeedbackStats = {
  totalCorrections: number;
  mostCorrectedToolId: string | null;
  recentCorrectionRate7d: number;      // corrections in last 7 days
  topMisroutes: MisrouteRecord[];
  improvementTrend: "improving" | "stable" | "degrading";
};

export type MisrouteRecord = {
  wrongToolId: string;
  correctToolId: string;
  count: number;
};

// ── Internal: router cache invalidation ──────────────────────────────────────
// Replicates the key algorithm from aiRouter WITHOUT importing it (avoids
// circular dependency: aiRouter → feedbackEngine → aiRouter).
// Key algorithm must stay in sync with aiRouter.makeCacheKey().

const CACHE_PREFIX = "ar:";

function invalidateRouterCache(query: string): void {
  try {
    const key = btoa(encodeURIComponent(query.trim().toLowerCase()));
    sessionStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch {
    // sessionStorage might be unavailable (e.g., private-mode iOS) — ignore
  }
}

/** Clears ALL router cache entries (used after bulk imports or data reset). */
export function clearAllRouterCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(CACHE_PREFIX)) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}

// ── Core: record a correction ─────────────────────────────────────────────────

/**
 * Records a user correction: they picked `correctToolId` after the router
 * suggested `wrongToolId` for `query`.
 *
 * Effects:
 *   • Persists to ragEngine corrections store (IndexedDB).
 *   • Invalidates the stale session cache entry for this query.
 *   • Next routeQuery call for the same query re-runs Gemini with updated
 *     few-shot examples, preventing the same mistake.
 *
 * Validates both toolIds against the registry — silently no-ops if invalid.
 */
export async function recordFeedback(
  query: string,
  wrongToolId: string,
  correctToolId: string
): Promise<void> {
  // Validate tool IDs exist in registry
  if (!getToolById(correctToolId)) {
    console.warn(`[feedbackEngine] Unknown correctToolId: "${correctToolId}" — skipping.`);
    return;
  }
  // wrongToolId may be empty string if router returned null — that's fine
  if (wrongToolId && !getToolById(wrongToolId)) {
    console.warn(`[feedbackEngine] Unknown wrongToolId: "${wrongToolId}" — recording anyway.`);
  }

  // 1. Persist to IndexedDB via ragEngine
  await recordCorrection(query, wrongToolId, correctToolId).catch(err => {
    console.error("[feedbackEngine] Failed to persist correction:", err);
  });

  // 2. Invalidate router cache so the next call for this query is fresh
  invalidateRouterCache(query);
}

// ── Few-shot example builder ──────────────────────────────────────────────────

/**
 * Builds a string of recent user corrections formatted as few-shot examples
 * for injection into the Gemini routing prompt.
 *
 * @param limit  Max number of examples to include (default 5).
 * @returns A formatted string block, or "" if no corrections exist yet.
 *
 * This function is called by aiRouter.buildSystemPrompt on every Gemini call.
 */
export async function buildFewShotExamples(limit = 5): Promise<string> {
  try {
    const corrections = await getRecentCorrections(limit);
    if (corrections.length === 0) return "";

    const lines: string[] = [
      "CORRECTION HISTORY — user confirmed these tool mappings (highest priority):"
    ];

    for (const c of corrections) {
      const correctTool = getToolById(c.correctToolId);
      const wrongLabel  = c.wrongToolId ? ` (not: ${c.wrongToolId})` : "";
      const toolName    = correctTool ? ` [${correctTool.name}]` : "";
      lines.push(
        `  Query: "${c.userQuery}" → correct tool: ${c.correctToolId}${toolName}${wrongLabel}`
      );
    }

    return lines.join("\n");
  } catch {
    // Non-fatal — router still works without few-shot examples
    return "";
  }
}

// ── Legacy compat: apply few-shot to a base prompt ────────────────────────────

/**
 * Prepends few-shot correction examples to an existing prompt string.
 * Kept for backward compatibility with any callers outside aiRouter.
 */
export async function applyFeedbackToRouter(basePrompt: string): Promise<string> {
  const fewShot = await buildFewShotExamples();
  return fewShot ? `${fewShot}\n\n${basePrompt}` : basePrompt;
}

// ── Stats for Insights Dashboard ──────────────────────────────────────────────

/**
 * Computes aggregate statistics from the corrections store.
 * Used by the Insights Dashboard (Phase 8) to show routing accuracy trends.
 */
export async function getFeedbackStats(): Promise<FeedbackStats> {
  try {
    // Fetch up to 500 corrections for stats
    const corrections = await getRecentCorrections(500);

    if (corrections.length === 0) {
      return {
        totalCorrections: 0,
        mostCorrectedToolId: null,
        recentCorrectionRate7d: 0,
        topMisroutes: [],
        improvementTrend: "stable"
      };
    }

    const now     = Date.now();
    const week7Ms = 7 * 24 * 60 * 60 * 1000;

    // Count per wrongToolId to find most-corrected
    const wrongCount = new Map<string, number>();
    // Count misroute pairs
    const pairCount  = new Map<string, { wrong: string; correct: string; count: number }>();
    let recent7d     = 0;

    for (const c of corrections) {
      if (c.wrongToolId) {
        wrongCount.set(c.wrongToolId, (wrongCount.get(c.wrongToolId) ?? 0) + 1);
      }
      const pairKey = `${c.wrongToolId}→${c.correctToolId}`;
      const existing = pairCount.get(pairKey);
      if (existing) {
        existing.count++;
      } else {
        pairCount.set(pairKey, { wrong: c.wrongToolId, correct: c.correctToolId, count: 1 });
      }
      if (now - c.timestamp < week7Ms) recent7d++;
    }

    // Most corrected single tool
    let mostCorrectedToolId: string | null = null;
    let maxCount = 0;
    for (const [id, count] of wrongCount.entries()) {
      if (count > maxCount) { maxCount = count; mostCorrectedToolId = id; }
    }

    // Top 5 misroute pairs
    const topMisroutes: MisrouteRecord[] = [...pairCount.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(r => ({ wrongToolId: r.wrong, correctToolId: r.correct, count: r.count }));

    // Trend: compare first-half vs second-half correction rate
    const half     = Math.floor(corrections.length / 2);
    const firstH   = corrections.slice(half);  // older (sorted newest-first)
    const secondH  = corrections.slice(0, half); // newer
    const oldRate  = firstH.length > 0  ? firstH.length  : 1;
    const newRate  = secondH.length > 0 ? secondH.length : 0;
    const trend: FeedbackStats["improvementTrend"] =
      newRate < oldRate * 0.8 ? "improving"
      : newRate > oldRate * 1.2 ? "degrading"
      : "stable";

    return {
      totalCorrections: corrections.length,
      mostCorrectedToolId,
      recentCorrectionRate7d: recent7d,
      topMisroutes,
      improvementTrend: trend
    };
  } catch {
    return {
      totalCorrections: 0,
      mostCorrectedToolId: null,
      recentCorrectionRate7d: 0,
      topMisroutes: [],
      improvementTrend: "stable"
    };
  }
}

// ── Conversion helper ─────────────────────────────────────────────────────────

/**
 * Converts a CorrectionEntry from ragEngine to a FeedbackEntry.
 * Useful for components that still use the legacy FeedbackEntry shape.
 */
export function correctionToFeedbackEntry(c: CorrectionEntry): FeedbackEntry {
  return {
    query: c.userQuery,
    routerSelectedToolId: c.wrongToolId,
    userCorrectedToolId: c.correctToolId,
    timestamp: c.timestamp,
    usedAsFewShot: true
  };
}
