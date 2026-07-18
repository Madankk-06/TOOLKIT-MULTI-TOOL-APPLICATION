/**
 * FILE: src/lib/ragEngine.ts
 *
 * Retrieval-Augmented Generation (RAG) memory store for Toolkit.
 *
 * Storage architecture:
 *   IndexedDB "toolkit-memory" v3
 *   ├── interactions  — full session memory (capped at 200 entries)
 *   ├── preferences   — key-value user preferences learned from usage
 *   └── corrections   — toolId corrections used to reinforce the router
 *
 * Embedding strategy:
 *   Semantic embeddings via @google/genai "text-embedding-004" model.
 *   Cosine similarity used for retrieval ranking.
 *   Falls back to keyword TF-IDF score if the API is unavailable.
 *
 * Context budget:
 *   buildContextPrompt hard-caps its output at ~2800 tokens to
 *   stay well under Gemini-1.5-flash's context limit.
 */

import { GoogleGenAI } from "@google/genai";

// ── Gemini client for embeddings ──────────────────────────────────────────────
const GENAI_API_KEY: string = (import.meta.env.VITE_GEMINI_API_KEY as string) ?? "";
const ai = new GoogleGenAI({ apiKey: GENAI_API_KEY });

// ── IndexedDB constants ───────────────────────────────────────────────────────
const DB_NAME     = "toolkit-memory";
const DB_VERSION  = 3;
const INTERACTION_STORE = "interactions";
const PREF_STORE        = "preferences";
const CORRECTION_STORE  = "corrections";
const MAX_INTERACTIONS  = 200;

// ── Public types ──────────────────────────────────────────────────────────────

export type MemoryEntry = {
  id: string;
  timestamp: number;
  toolId: string;
  userQuery: string;
  inputData: Record<string, string | number | boolean | null>;
  outputData: Record<string, string | number | boolean | null>;
  embedding: number[];
  tags: string[];
};

export type UserPreference = {
  key: string;
  value: string | number | boolean;
  learnedFrom: string[];
  lastUpdated: number;
  confidence: number;    // 0–1, increases with each confirming interaction
};

export type CorrectionEntry = {
  id: string;
  timestamp: number;
  userQuery: string;
  wrongToolId: string;
  correctToolId: string;
};

// ── DB initialisation ─────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db  = req.result;
      const old = (event as IDBVersionChangeEvent).oldVersion;

      // Create stores fresh on first install
      if (old < 1) {
        if (!db.objectStoreNames.contains(INTERACTION_STORE)) {
          db.createObjectStore(INTERACTION_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(PREF_STORE)) {
          db.createObjectStore(PREF_STORE, { keyPath: "key" });
        }
      }
      // v3: add corrections store
      if (old < 3) {
        if (!db.objectStoreNames.contains(CORRECTION_STORE)) {
          db.createObjectStore(CORRECTION_STORE, { keyPath: "id" });
        }
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

// ── Embedding helpers ─────────────────────────────────────────────────────────

/** Calls Gemini text-embedding-004 for a semantic vector. */
async function getEmbedding(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: "text-embedding-004",
    contents: text
  });
  // @google/genai v2 returns embeddings in response.embeddings[0].values
  const values = response.embeddings?.[0]?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Empty embedding response from Gemini.");
  }
  return values;
}

/** Keyword TF-IDF fallback when Gemini embedding API is unavailable. */
function keywordSimilarity(queryWords: Set<string>, entryTags: string[]): number {
  if (queryWords.size === 0 || entryTags.length === 0) return 0;
  let hits = 0;
  for (const tag of entryTags) {
    if (queryWords.has(tag.toLowerCase())) hits++;
  }
  return hits / Math.max(queryWords.size, entryTags.length);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, mA = 0, mB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    mA  += a[i] * a[i];
    mB  += b[i] * b[i];
  }
  const denom = Math.sqrt(mA) * Math.sqrt(mB);
  return denom === 0 ? 0 : dot / denom;
}

// ── Preference extraction rules ───────────────────────────────────────────────

const PREF_RULES: Record<string, string[]> = {
  weight_unit:    ["kg",        "lbs",      "pounds"  ],
  temp_unit:      ["celsius",   "fahrenheit","kelvin"  ],
  distance_unit:  ["km",        "miles",    "meters"  ],
  currency:       ["usd",       "inr",      "eur",      "gbp", "jpy", "aed"],
  volume_unit:    ["ml",        "liters",   "gallons" ],
  language:       ["hindi",     "tamil",    "telugu",   "kannada","spanish","french","german"],
  theme:          ["dark",      "light"                ]
};

async function upsertPreference(
  db: IDBDatabase,
  key: string,
  value: string,
  interactionId: string
): Promise<void> {
  return new Promise<void>((resolve) => {
    const tx    = db.transaction(PREF_STORE, "readwrite");
    const store = tx.objectStore(PREF_STORE);
    const getReq = store.get(key);
    getReq.onsuccess = () => {
      const existing = getReq.result as UserPreference | undefined;
      const learnt   = existing?.learnedFrom ?? [];
      const conf     = Math.min(1, (existing?.confidence ?? 0) + 0.1);
      const updated: UserPreference = {
        key,
        value,
        learnedFrom: [...learnt, interactionId].slice(-20),
        lastUpdated: Date.now(),
        confidence: conf
      };
      store.put(updated);
      resolve();
    };
    getReq.onerror = () => resolve(); // non-fatal
  });
}

// ── Auto-prune (keep last MAX_INTERACTIONS entries) ───────────────────────────

async function pruneOldInteractions(db: IDBDatabase): Promise<void> {
  return new Promise<void>((resolve) => {
    const tx    = db.transaction(INTERACTION_STORE, "readwrite");
    const store = tx.objectStore(INTERACTION_STORE);
    const allReq = store.getAll();
    allReq.onsuccess = () => {
      const all = allReq.result as MemoryEntry[];
      if (all.length <= MAX_INTERACTIONS) { resolve(); return; }
      all
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, all.length - MAX_INTERACTIONS)
        .forEach(e => store.delete(e.id));
      resolve();
    };
    allReq.onerror = () => resolve(); // non-fatal
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Stores a completed tool interaction in IndexedDB with a semantic embedding.
 * Automatically:
 *   • Generates tags from the toolId and query words
 *   • Extracts and upserts user preferences (units, language, currency, etc.)
 *   • Prunes entries older than the 200-entry cap
 *
 * Falls back to keyword tags if the embedding API call fails.
 * Never throws.
 */
export async function storeInteraction(
  toolId: string,
  query: string,
  input: Record<string, string | number | boolean | null>,
  output: Record<string, string | number | boolean | null>
): Promise<void> {
  try {
    const db = await openDB();
    const id  = crypto.randomUUID();
    const ts  = Date.now();

    const qWords  = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const tags    = [toolId, ...qWords].slice(0, 8);

    let embedding: number[] = [];
    try {
      embedding = await getEmbedding(query);
    } catch {
      // Embedding failed — store with empty vector; retrieval falls back to keyword similarity
      embedding = [];
    }

    const entry: MemoryEntry = { id, timestamp: ts, toolId, userQuery: query, inputData: input, outputData: output, embedding, tags };

    await new Promise<void>((resolve) => {
      const tx    = db.transaction(INTERACTION_STORE, "readwrite");
      tx.objectStore(INTERACTION_STORE).add(entry);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => resolve(); // non-fatal
    });

    // Extract preferences in parallel — non-fatal
    const combined = (query + " " + JSON.stringify(input)).toLowerCase();
    const prefJobs: Promise<void>[] = [];
    for (const [prefKey, values] of Object.entries(PREF_RULES)) {
      for (const val of values) {
        if (combined.includes(val)) {
          prefJobs.push(upsertPreference(db, prefKey, val, id));
        }
      }
    }
    await Promise.allSettled(prefJobs);

    // Prune — non-fatal
    await pruneOldInteractions(db).catch(() => undefined);
  } catch {
    // storeInteraction must never propagate — it's a background write
  }
}

/**
 * Retrieves the most relevant past interactions for a given query.
 * Uses cosine similarity on embeddings when available; falls back to
 * keyword overlap scoring when embeddings are missing.
 *
 * @param query  User query string to search against.
 * @param limit  Max number of entries to return (default 5).
 */
export async function retrieveRelevantContext(
  query: string,
  limit = 5
): Promise<MemoryEntry[]> {
  const db   = await openDB();
  const qLow = query.toLowerCase();
  const qSet = new Set(qLow.split(/\s+/).filter(w => w.length > 2));

  let queryEmbedding: number[] = [];
  try {
    queryEmbedding = await getEmbedding(query);
  } catch {
    // Proceed with keyword fallback
  }

  return new Promise<MemoryEntry[]>((resolve, reject) => {
    const tx     = db.transaction(INTERACTION_STORE, "readonly");
    const store  = tx.objectStore(INTERACTION_STORE);
    const getAll = store.getAll();

    getAll.onsuccess = () => {
      const all = getAll.result as MemoryEntry[];
      const scored = all.map(entry => {
        let score = 0;
        if (queryEmbedding.length > 0 && entry.embedding.length > 0) {
          score = cosineSimilarity(queryEmbedding, entry.embedding);
        } else {
          score = keywordSimilarity(qSet, entry.tags);
        }
        return { entry, score };
      });

      resolve(
        scored
          .filter(r => r.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map(r => r.entry)
      );
    };
    getAll.onerror = () => reject(getAll.error);
  });
}

/**
 * Returns all stored user preferences, sorted by confidence descending.
 */
export async function getUserPreferences(): Promise<UserPreference[]> {
  const db = await openDB();
  return new Promise<UserPreference[]>((resolve, reject) => {
    const tx    = db.transaction(PREF_STORE, "readonly");
    const store = tx.objectStore(PREF_STORE);
    const req   = store.getAll();
    req.onsuccess = () => {
      const all = req.result as UserPreference[];
      resolve(all.sort((a, b) => b.confidence - a.confidence));
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Stores a router correction (user chose a different tool than AI suggested).
 * Used by feedbackEngine.buildFewShotExamples.
 */
export async function recordCorrection(
  userQuery: string,
  wrongToolId: string,
  correctToolId: string
): Promise<void> {
  try {
    const db = await openDB();
    const entry: CorrectionEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      userQuery,
      wrongToolId,
      correctToolId
    };
    await new Promise<void>((resolve) => {
      const tx    = db.transaction(CORRECTION_STORE, "readwrite");
      tx.objectStore(CORRECTION_STORE).add(entry);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => resolve(); // non-fatal
    });
  } catch {
    // Non-fatal — routing still works without this entry
  }
}

/**
 * Returns the most recent corrections, newest first.
 */
export async function getRecentCorrections(limit = 10): Promise<CorrectionEntry[]> {
  const db = await openDB();
  return new Promise<CorrectionEntry[]>((resolve, reject) => {
    const tx    = db.transaction(CORRECTION_STORE, "readonly");
    const store = tx.objectStore(CORRECTION_STORE);
    const req   = store.getAll();
    req.onsuccess = () => {
      const all = req.result as CorrectionEntry[];
      resolve(all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit));
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Returns the total count of stored interactions (all queries sent through the chat).
 * Used by the Insights Dashboard to show "total searches" stat.
 */
export async function getTotalInteractionCount(): Promise<number> {
  try {
    const db = await openDB();
    return new Promise<number>((resolve) => {
      const tx    = db.transaction(INTERACTION_STORE, "readonly");
      const store = tx.objectStore(INTERACTION_STORE);
      const req   = store.count();
      req.onsuccess = () => resolve(req.result as number);
      req.onerror   = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

/**
 * Returns the 5 most recently stored memory interactions.
 * Used by the Insights Dashboard to show recent activity.
 */
export async function getRecentInteractions(limit = 5): Promise<MemoryEntry[]> {
  try {
    const db = await openDB();
    return new Promise<MemoryEntry[]>((resolve) => {
      const tx    = db.transaction(INTERACTION_STORE, "readonly");
      const store = tx.objectStore(INTERACTION_STORE);
      const req   = store.getAll();
      req.onsuccess = () => {
        const all = req.result as MemoryEntry[];
        resolve(all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit));
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}



/**
 * Deletes interactions older than `maxAgeDays` days.
 * Returns the number of entries removed.
 */
export async function clearOldMemory(maxAgeDays = 30): Promise<number> {
  const db        = await openDB();
  const cutoff    = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let   removed   = 0;

  return new Promise<number>((resolve) => {
    const tx    = db.transaction(INTERACTION_STORE, "readwrite");
    const store = tx.objectStore(INTERACTION_STORE);
    const req   = store.getAll();

    req.onsuccess = () => {
      const old = (req.result as MemoryEntry[]).filter(e => e.timestamp < cutoff);
      old.forEach(e => { store.delete(e.id); removed++; });
    };
    tx.oncomplete = () => resolve(removed);
    tx.onerror    = () => resolve(0);
  });
}

// ── Context prompt builder ────────────────────────────────────────────────────

/**
 * Assembles the RAG context block injected into the Gemini system prompt.
 *
 * Hard-caps at ~2800 tokens (≈ 11 200 chars) to leave room for the
 * registry and function declarations.
 */
export function buildContextPrompt(
  _query: string,
  relevantMemory: MemoryEntry[],
  preferences: UserPreference[]
): string {
  const MAX_CHARS = 11_200; // ~2800 tokens @4 chars/token
  const lines: string[] = ["USER CONTEXT:"];

  // Preferences first (lowest token cost, highest signal)
  if (preferences.length > 0) {
    lines.push("Learned preferences:");
    for (const p of preferences) {
      lines.push(
        `  • ${p.key.replace(/_/g, " ")}: ${String(p.value)}` +
        ` (confidence ${Math.round(p.confidence * 100)}%,` +
        ` seen in ${p.learnedFrom.length} session(s))`
      );
    }
  }

  // Recent relevant interactions
  if (relevantMemory.length > 0) {
    lines.push("\nRecent relevant interactions:");
    for (let i = 0; i < relevantMemory.length; i++) {
      const m    = relevantMemory[i];
      const date = new Date(m.timestamp).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
      });
      // Keep each entry compact — only query + toolId + compact input
      const inputStr = JSON.stringify(m.inputData).slice(0, 120);
      lines.push(
        `  ${i + 1}. [${date}] "${m.userQuery}" → ${m.toolId}` +
        (inputStr !== "{}" ? ` | input: ${inputStr}` : "")
      );
    }
  }

  if (lines.length === 1) {
    return "USER CONTEXT: No prior context available.";
  }

  // Token budget guard — truncate lines from the end until under limit
  let result = lines.join("\n");
  while (result.length > MAX_CHARS && lines.length > 2) {
    lines.pop();
    result = lines.join("\n");
  }

  return result;
}
