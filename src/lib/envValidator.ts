/**
 * FILE: src/lib/envValidator.ts
 *
 * Boot-time environment variable validator for Toolkit.
 *
 * Called once from main.tsx before the app renders.
 * Prints a clear console table of all vars, their status, and importance.
 * Never throws — the app should still load even if non-critical vars are missing.
 *
 * Usage:
 *   import { validateEnv } from './lib/envValidator';
 *   validateEnv(); // call before ReactDOM.createRoot
 */

// ── Types ─────────────────────────────────────────────────────────────────────

type VarStatus = "ok" | "missing" | "empty" | "invalid";
type Importance = "critical" | "important" | "optional";

type EnvVar = {
  key: string;
  importance: Importance;
  description: string;
  validate?: (value: string) => boolean;
};

type ValidationResult = {
  key: string;
  status: VarStatus;
  importance: Importance;
  description: string;
  hint?: string;
};

// ── Required variable definitions ─────────────────────────────────────────────

const REQUIRED_VARS: EnvVar[] = [
  // AI
  {
    key: "VITE_GEMINI_API_KEY",
    importance: "critical",
    description: "Gemini AI — routing, sidekick, embeddings",
    validate: v => v.startsWith("AI") && v.length > 20
  },
  // Firebase
  {
    key: "VITE_FIREBASE_API_KEY",
    importance: "critical",
    description: "Firebase authentication",
    validate: v => v.startsWith("AIza") && v.length > 20
  },
  {
    key: "VITE_FIREBASE_AUTH_DOMAIN",
    importance: "critical",
    description: "Firebase auth domain",
    validate: v => v.includes(".firebaseapp.com") || v.includes(".firebase.com")
  },
  {
    key: "VITE_FIREBASE_PROJECT_ID",
    importance: "critical",
    description: "Firebase project ID",
    validate: v => v.length >= 4 && !v.includes(" ")
  },
  {
    key: "VITE_FIREBASE_DB_URL",
    importance: "important",
    description: "Firebase Realtime Database URL",
    validate: v => v.includes(".firebaseio.com") || v.includes("firebasedatabase")
  },
  {
    key: "VITE_FIREBASE_STORAGE_BUCKET",
    importance: "important",
    description: "Firebase Storage bucket",
    validate: v => v.includes(".appspot.com") || v.includes(".firebasestorage.app")
  },
  {
    key: "VITE_FIREBASE_MESSAGING_SENDER_ID",
    importance: "important",
    description: "Firebase Cloud Messaging sender ID",
    validate: v => /^\d{10,20}$/.test(v)
  },
  {
    key: "VITE_FIREBASE_APP_ID",
    importance: "important",
    description: "Firebase App ID",
    validate: v => v.includes(":") && v.length > 20
  },
  // APIs
  {
    key: "VITE_WEATHER_KEY",
    importance: "optional",
    description: "OpenWeatherMap API key (weather tool)",
    validate: v => v.length >= 16
  },
  {
    key: "VITE_TRANSLATE_KEY",
    importance: "optional",
    description: "Translate API key (translator tool)",
    validate: v => v.length >= 10
  },
  {
    key: "VITE_EMAILJS_SERVICE_ID",
    importance: "important",
    description: "EmailJS Service ID (OTP registration email)",
    validate: v => v.length > 3
  },
  {
    key: "VITE_EMAILJS_TEMPLATE_ID",
    importance: "important",
    description: "EmailJS Template ID (OTP registration email)",
    validate: v => v.length > 3
  },
  {
    key: "VITE_EMAILJS_PUBLIC_KEY",
    importance: "important",
    description: "EmailJS Public Key (OTP registration email)",
    validate: v => v.length > 3
  },
  {
    key: "VITE_POSTHOG_KEY",
    importance: "optional",
    description: "PostHog analytics key",
    validate: v => v.startsWith("phc_") || v.length > 10
  }
];

// ── Validator ─────────────────────────────────────────────────────────────────

export function validateEnv(): ValidationResult[] {
  const results: ValidationResult[] = [];
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const def of REQUIRED_VARS) {
    const raw = (import.meta.env[def.key] as string | undefined) ?? "";
    let status: VarStatus;
    let hint: string | undefined;

    if (!raw) {
      status = "missing";
      if (def.importance === "critical") {
        missing.push(def.key);
        hint = "⚠️ Set this in your .env.local file";
      }
    } else if (raw.trim().length === 0) {
      status = "empty";
      hint = "Variable exists but is blank";
    } else if (def.validate && !def.validate(raw)) {
      status = "invalid";
      invalid.push(def.key);
      hint = "Value looks malformed — double-check it";
    } else {
      status = "ok";
    }

    results.push({
      key: def.key,
      status,
      importance: def.importance,
      description: def.description,
      hint
    });
  }

  // ── Console output ─────────────────────────────────────────────────────────
  const icons: Record<VarStatus, string>     = { ok: "✅", missing: "❌", empty: "⚠️", invalid: "🔶" };
  const labels: Record<Importance, string>   = { critical: "CRITICAL", important: "IMPORTANT", optional: "optional" };

  console.groupCollapsed(
    `%c[Toolkit] Environment Check — ${results.filter(r => r.status === "ok").length}/${results.length} vars OK`,
    "font-weight:600; color: #6C63FF"
  );

  console.table(
    Object.fromEntries(
      results.map(r => [
        r.key,
        {
          status:      icons[r.status],
          importance:  labels[r.importance],
          description: r.description,
          hint:        r.hint ?? ""
        }
      ])
    )
  );

  if (missing.length > 0) {
    console.error(
      `%c[Toolkit] ❌ ${missing.length} CRITICAL env var(s) missing:\n  ${missing.join("\n  ")}` +
      "\n\nCopy .env.example → .env.local and fill in the values.",
      "color: #f87171; font-weight: 600"
    );
  }

  if (invalid.length > 0) {
    console.warn(
      `%c[Toolkit] 🔶 ${invalid.length} env var(s) look malformed:\n  ${invalid.join("\n  ")}`,
      "color: #fbbf24; font-weight: 600"
    );
  }

  if (missing.length === 0 && invalid.length === 0) {
    console.log(
      "%c[Toolkit] ✅ All environment variables validated successfully.",
      "color: #4ade80; font-weight: 600"
    );
  }

  console.groupEnd();

  return results;
}

/**
 * Returns true if VITE_GEMINI_API_KEY is present and non-empty.
 * Use this as a quick guard before making Gemini API calls.
 */
export function hasGeminiKey(): boolean {
  const key = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ?? "";
  return key.trim().length > 0;
}

/**
 * Returns a redacted preview of an API key for logging.
 * e.g. "AIzaSyA…xyz"
 */
export function redactKey(key: string): string {
  if (key.length <= 8) return "***";
  return `${key.slice(0, 7)}…${key.slice(-3)}`;
}
