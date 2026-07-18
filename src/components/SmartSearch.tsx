/**
 * FILE: src/components/SmartSearch.tsx
 *
 * AI-powered universal search bar for Toolkit.
 *
 * Features:
 *   • Debounced Fuse.js local suggestions as you type
 *   • Full AI routing via routeQuery (local → Gemini → fuzzy)
 *   • Voice input via Web Speech API
 *   • Document upload (PDF, DOCX, TXT, images) — extracted locally, no API call
 *   • Image upload — vision context passed to router
 *   • Clarification chips when router is uncertain
 *   • RLHF correction: "Was this right?" button records feedback
 *   • react-router-dom navigate (no window.location.hash)
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo
} from "react";
import { useNavigate } from "react-router-dom";
import Fuse from "fuse.js";
import * as pdfjs from "pdfjs-dist";
import mammoth from "mammoth";
import { GoogleGenAI } from "@google/genai";
import { toolsRegistry, type ToolConfig } from "../lib/toolsRegistry";
import { routeQuery, type RouterResult } from "../lib/aiRouter";
import { recordFeedback } from "../lib/feedbackEngine";
import { storeInteraction } from "../lib/ragEngine";

// PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// Gemini client for document/image context extraction
const GENAI_API_KEY: string =
  (import.meta.env.VITE_GEMINI_API_KEY as string) ?? "";
const ai = new GoogleGenAI({ apiKey: GENAI_API_KEY });

// ── Web Speech API local declarations (not in all tsconfig lib sets) ────────
declare interface SpeechRecognitionResultEntry {
  readonly transcript: string;
  readonly confidence: number;
}
declare interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionResultEntry;
}
declare interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
declare interface SpeechRecognitionEventLocal extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
declare interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart:  ((ev: Event) => void) | null;
  onresult: ((ev: SpeechRecognitionEventLocal) => void) | null;
  onerror:  ((ev: Event) => void) | null;
  onend:    ((ev: Event) => void) | null;
}
declare interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type SearchPhase =
  | "idle"
  | "listening"
  | "routing"
  | "extracting"
  | "done"
  | "error";

// ── SVG Icons for Professional Aesthetics ──────────────────────────────────────
const DocIconSVG = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

const AttachmentIconSVG = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);

const VoiceIconSVG = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
  </svg>
);

const StopIconSVG = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <rect x="9" y="9" width="6" height="6" fill="currentColor"/>
  </svg>
);

const YesIconSVG = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, display: "inline-block", verticalAlign: "middle" }}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const NoIconSVG = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, display: "inline-block", verticalAlign: "middle" }}>
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const BrainIconSVG = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }}>
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1 0-3.12 3 3 0 0 1 0-4.88 2.5 2.5 0 0 1 0-3.12A2.5 2.5 0 0 1 9.5 2z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 0-3.12 3 3 0 0 0 0-4.88 2.5 2.5 0 0 0 0-3.12A2.5 2.5 0 0 0 14.5 2z"/>
  </svg>
);

const ErrorIconSVG = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

interface SmartSearchProps {
  initialQuery?: string;
}

// ── SmartSearch component ─────────────────────────────────────────────────────

export const SmartSearch: React.FC<SmartSearchProps> = ({ initialQuery }) => {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [query, setQuery]                     = useState("");

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      handleSearch(initialQuery);
      // Clean query parameter from browser history to avoid back-button infinite loops
      navigate('/', { replace: true });
    }
  }, [initialQuery, navigate]);

  const [suggestions, setSuggestions]         = useState<ToolConfig[]>([]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [routerResult, setRouterResult]       = useState<RouterResult | null>(null);
  const [phase, setPhase]                     = useState<SearchPhase>("idle");
  const [uploadContext, setUploadContext]     = useState<string | null>(null);
  const [uploadMimeType, setUploadMimeType]   = useState<string | null>(null);
  const [uploadBase64, setUploadBase64]       = useState<string | null>(null);
  const [errorMsg, setErrorMsg]               = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven]     = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCorrectionPicker, setShowCorrectionPicker] = useState(false);
  const [correctionSearch, setCorrectionSearch] = useState("");

  // Pending feedback banner states
  interface PendingFeedback {
    query: string;
    suggestedToolId: string;
    suggestedToolName: string;
  }
  const [pendingFeedback, setPendingFeedback] = useState<PendingFeedback | null>(null);
  const [showPendingCorrection, setShowPendingCorrection] = useState(false);
  const [pendingCorrectionSearch, setPendingCorrectionSearch] = useState("");

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("pending_feedback");
      if (saved) {
        setPendingFeedback(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const handlePendingFeedbackYes = () => {
    sessionStorage.removeItem("pending_feedback");
    setPendingFeedback(null);
  };

  const handlePendingFeedbackNo = () => {
    setShowPendingCorrection(true);
  };

  const handlePendingCorrectionSelect = async (correctedToolId: string) => {
    if (pendingFeedback) {
      await recordFeedback(
        pendingFeedback.query,
        pendingFeedback.suggestedToolId,
        correctedToolId
      );
      sessionStorage.removeItem("pending_feedback");
      setPendingFeedback(null);
      setShowPendingCorrection(false);
      setPendingCorrectionSearch("");
    }
  };

  const inputRef      = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<any>(null);

  const debouncedQuery = useDebounce(query, 200);

  // ── Fuse.js instance (memoised) ────────────────────────────────────────────
  const fuse = useMemo(
    () =>
      new Fuse(toolsRegistry, {
        keys: [
          { name: "name",        weight: 0.5 },
          { name: "keywords",    weight: 0.35 },
          { name: "description", weight: 0.15 }
        ],
        threshold: 0.4,
        includeScore: true
      }),
    []
  );

  // ── Local suggestions on debounced query ────────────────────────────────────
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const results = fuse.search(debouncedQuery).slice(0, 5).map(r => r.item);
    setSuggestions(results);
    setShowSuggestions(results.length > 0);
  }, [debouncedQuery, fuse]);

  // ── Core: route a query ────────────────────────────────────────────────────
  const handleSearch = useCallback(
    async (overrideQuery?: string) => {
      let q = (overrideQuery ?? query).trim();
      if (!q) {
        // Fallback default query if a file is uploaded
        try {
          const pending = sessionStorage.getItem("chatbot-pending-file");
          if (pending) {
            const parsed = JSON.parse(pending);
            const ext = (parsed.name || "").toLowerCase().split(".").pop() || "";
            if (ext === "pdf") {
              q = "pdf to word";
            } else if (["docx", "doc"].includes(ext)) {
              q = "word to pdf";
            } else if (parsed.isImage) {
              q = "extract text from image";
            } else {
              q = "extract text";
            }
            setQuery(q);
          }
        } catch { /* ignore */ }
      }
      if (!q) return;

      // Save query to local storage history
      try {
        const stored = localStorage.getItem('toolkit-chat-history');
        let historyList: string[] = stored ? JSON.parse(stored) : [
          'Code Error Troubleshooting',
          'Google One Video Creation',
          'Variable Name Validation',
          'Future Predictions Analysis',
          'Toolkit App About Section'
        ];
        historyList = historyList.filter((item: string) => item.toLowerCase() !== q.toLowerCase());
        historyList.unshift(q);
        historyList = historyList.slice(0, 8);
        localStorage.setItem('toolkit-chat-history', JSON.stringify(historyList));
        window.dispatchEvent(new Event('toolkit-chat-history-updated'));
      } catch (e) {
        console.error("Failed to write search query history:", e);
      }

      setPhase("routing");
      setErrorMsg(null);
      setShowSuggestions(false);
      setFeedbackGiven(false);
      setRouterResult(null);
      setShowCorrectionPicker(false);
      setCorrectionSearch("");

      try {
        const mediaCtx =
          uploadBase64 && uploadMimeType
            ? {
                type:          "image" as const,
                base64Content: uploadBase64,
                mimeType:      uploadMimeType
              }
            : undefined;

        const result = await routeQuery(q, { mediaContext: mediaCtx });
        setRouterResult(result);

        // ── MULTI-TOOL: navigate to split-screen workspace ──────────
        if (result.mode === "multi" && result.primaryTool && result.additionalTools.length > 0) {
          // Store interaction for matched tools
          const allTools = [result.primaryTool, ...result.additionalTools];
          allTools.forEach(match => {
            storeInteraction(match.toolId, q, match.prefillData || {}, {});
          });

          // Save pending feedback details to sessionStorage for the primary tool
          sessionStorage.setItem("pending_feedback", JSON.stringify({
            query: q,
            suggestedToolId: result.primaryTool.toolId,
            suggestedToolName: result.primaryTool.tool.name
          }));

          const panels = [
            result.primaryTool,
            ...result.additionalTools,
          ].slice(0, 3).map(match => ({
            toolId: match.toolId,
            toolName: match.tool.name,
            route: match.tool.route,
            prefillData: match.prefillData,
            category: match.tool.category,
          }));

          navigate('/multi-tool', {
            state: {
              panels,
              query: q,
              workflowDescription: result.workflowDescription || `${panels.map(p => p.toolName).join(' + ')}`,
            }
          });
          setPhase("done");
          return;
        }

        // ── SINGLE-TOOL: auto-navigate with prefill ─────────────────
        if (result.primaryTool) {
          // Store interaction in RAG memory
          storeInteraction(
            result.primaryTool.toolId,
            q,
            result.primaryTool.prefillData || {},
            {}
          );

          // Save pending feedback details to sessionStorage
          sessionStorage.setItem("pending_feedback", JSON.stringify({
            query: q,
            suggestedToolId: result.primaryTool.toolId,
            suggestedToolName: result.primaryTool.tool.name
          }));

          navigate(result.primaryTool.tool.route, {
            state: {
              params: result.primaryTool.prefillData,
              aiPayload: result.primaryTool.prefillData
            }
          });
        }

        setPhase("done");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMsg(msg);
        setPhase("error");
      }
    },
    [query, uploadBase64, uploadMimeType, navigate]
  );

  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setQuery(customEvent.detail);
        handleSearch(customEvent.detail);
      }
    };
    window.addEventListener('trigger-smart-search', handleTrigger);
    return () => window.removeEventListener('trigger-smart-search', handleTrigger);
  }, [handleSearch]);

  // ── Voice input ────────────────────────────────────────────────────────────
  const toggleListening = useCallback(() => {
    if (phase === "listening") {
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      recognitionRef.current?.stop();
      setPhase("idle");
      return;
    }

    const win = window as unknown as Record<string, unknown>;
    const SRCtor =
      (win["SpeechRecognition"] as SpeechRecognitionConstructor | undefined) ??
      (win["webkitSpeechRecognition"] as SpeechRecognitionConstructor | undefined);

    if (!SRCtor) {
      setErrorMsg("Voice search is not supported in this browser.");
      return;
    }

    const recognition = new SRCtor();
    recognition.continuous     = true;
    recognition.interimResults = true;
    recognition.lang           = "en-IN";
    recognitionRef.current     = recognition;

    recognition.onstart = () => setPhase("listening");

    recognition.onresult = (event: SpeechRecognitionEventLocal) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          finalTranscript += res[0].transcript;
        } else {
          interimTranscript += res[0].transcript;
        }
      }

      if (finalTranscript) {
        setQuery(prev => {
          const newQuery = prev ? `${prev} ${finalTranscript}` : finalTranscript;
          if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = window.setTimeout(() => {
            recognition.stop();
            handleSearch(newQuery);
          }, 1500);
          return newQuery;
        });
      } else if (interimTranscript) {
        setInterimTranscript(interimTranscript);
        if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      }
    };

    recognition.onerror = () => {
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      setPhase("idle");
      setInterimTranscript("");
    };
    recognition.onend   = () => {
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      setPhase("idle");
      setInterimTranscript("");
    };
    recognition.start();
  }, [phase, handleSearch]);

  // ── Document upload ────────────────────────────────────────────────────────
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      setPhase("extracting");
      setErrorMsg(null);

      try {
        let extractedText = "";
        const fileName    = file.name.toLowerCase();
        const isImage     = file.type.startsWith("image/");

        if (fileName.endsWith(".pdf") || file.type === "application/pdf") {
          const buf = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument({ data: buf }).promise;
          for (let i = 1; i <= pdf.numPages; i++) {
            const page    = await pdf.getPage(i);
            const content = await page.getTextContent();
            extractedText += content.items
              .map(it => ("str" in it ? it.str : ""))
              .join(" ") + "\n";
          }
        } else if (
          fileName.endsWith(".docx") || fileName.endsWith(".doc") ||
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          const buf    = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer: buf });
          extractedText = result.value;
        } else if (isImage) {
          // For images: set as image context and let the user type their prompt alongside it
          const reader = new FileReader();
          const b64 = await new Promise<string>((resolve, reject) => {
            reader.onload  = () => resolve((reader.result as string).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          setUploadBase64(b64);
          setUploadMimeType(file.type);
          setUploadContext(`📷 ${file.name}`);
          // Store file info for TextScanner auto-load
          try {
            sessionStorage.setItem("chatbot-pending-file", JSON.stringify({
              name: file.name, type: file.type,
              base64: b64, isImage: true
            }));
          } catch { /* storage full */ }
          setPhase("idle");
          return;
        } else {
          extractedText = await file.text();
        }

        // ── Local routing — NO Gemini API call needed ──────────────────────
        // Build a meaningful query from filename + first 200 chars of content
        const fileLabel  = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
        const snippet    = extractedText.slice(0, 200).trim();
        const routeQuery = `${fileLabel} ${snippet}`.trim();
        const intent     = fileLabel || snippet.slice(0, 80) || file.name;

        // Store file as base64 in sessionStorage so target tools can auto-load it
        try {
          const reader = new FileReader();
          const b64 = await new Promise<string>((resolve, reject) => {
            reader.onload  = () => resolve((reader.result as string).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          sessionStorage.setItem("chatbot-pending-file", JSON.stringify({
            name: file.name, type: file.type,
            base64: b64, extractedText, isImage: false
          }));
        } catch { /* sessionStorage full — skip */ }

        setUploadContext(`📄 ${file.name}`);
        setUploadBase64(null);
        setUploadMimeType(null);
        setPhase("idle");
        // Keep query text input free — do not call handleSearch automatically!
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Document processing failed.";
        setErrorMsg(msg);
        setPhase("error");
      }
    },
    []
  );

  // ── Image upload ───────────────────────────────────────────────────────────
  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      setPhase("extracting");
      setErrorMsg(null);

      try {
        const b64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        setUploadBase64(b64);
        setUploadMimeType(file.type);
        setUploadContext(`📷 ${file.name}`);

        // Store file info for TextScanner auto-load
        try {
          sessionStorage.setItem("chatbot-pending-file", JSON.stringify({
            name: file.name, type: file.type,
            base64: b64, isImage: true
          }));
        } catch { /* storage full */ }

        setPhase("idle");
        // Keep query text input free — do not call handleSearch automatically!
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Image processing failed.";
        setErrorMsg(msg);
        setPhase("error");
      }
    },
    []
  );

  // ── Clipboard Paste Handler ────────────────────────────────────────────────
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLInputElement>) => {
      const files = e.clipboardData?.files;
      if (!files || files.length === 0) return;
      
      // Prevent default behavior so it doesn't try to paste text representation of the file
      e.preventDefault();
      
      const file = files[0];
      setPhase("extracting");
      setErrorMsg(null);

      try {
        let extractedText = "";
        const fileName    = file.name.toLowerCase();
        const isImage     = file.type.startsWith("image/");

        if (fileName.endsWith(".pdf") || file.type === "application/pdf") {
          const buf = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument({ data: buf }).promise;
          for (let i = 1; i <= pdf.numPages; i++) {
            const page    = await pdf.getPage(i);
            const content = await page.getTextContent();
            extractedText += content.items
              .map(it => ("str" in it ? it.str : ""))
              .join(" ") + "\n";
          }
        } else if (
          fileName.endsWith(".docx") || fileName.endsWith(".doc") ||
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          const buf    = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer: buf });
          extractedText = result.value;
        } else if (isImage) {
          const reader = new FileReader();
          const b64 = await new Promise<string>((resolve, reject) => {
            reader.onload  = () => resolve((reader.result as string).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          setUploadBase64(b64);
          setUploadMimeType(file.type);
          setUploadContext(`📷 ${file.name || 'Pasted Image'}`);
          try {
            sessionStorage.setItem("chatbot-pending-file", JSON.stringify({
              name: file.name || 'Pasted Image.png', type: file.type,
              base64: b64, isImage: true
            }));
          } catch { /* storage full */ }
          setPhase("idle");
          return;
        } else {
          extractedText = await file.text();
        }

        try {
          const reader = new FileReader();
          const b64 = await new Promise<string>((resolve, reject) => {
            reader.onload  = () => resolve((reader.result as string).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          sessionStorage.setItem("chatbot-pending-file", JSON.stringify({
            name: file.name || 'Pasted Document', type: file.type,
            base64: b64, extractedText, isImage: false
          }));
        } catch { /* sessionStorage full */ }

        setUploadContext(`📄 ${file.name || 'Pasted Document'}`);
        setUploadBase64(null);
        setUploadMimeType(null);
        setPhase("idle");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Document paste processing failed.";
        setErrorMsg(msg);
        setPhase("error");
      }
    },
    []
  );

  // ── RLHF feedback ──────────────────────────────────────────────────────────
  const handleFeedback = useCallback(
    async (correct: boolean, correctedToolId?: string) => {
      if (!routerResult || feedbackGiven) return;
      setFeedbackGiven(true);

      if (!correct && routerResult.primaryTool && correctedToolId) {
        await recordFeedback(
          query,
          routerResult.primaryTool.toolId,
          correctedToolId
        );
      }
    },
    [routerResult, feedbackGiven, query]
  );

  // ── Dismiss suggestions on outside click ──────────────────────────────────
  useEffect(() => {
    const handler = () => setShowSuggestions(false);
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  // ── Render helpers ─────────────────────────────────────────────────────────
  const isLoading  = phase === "routing" || phase === "extracting";
  const isListening = phase === "listening";

  const confidenceColor =
    !routerResult ? "#888"
    : routerResult.confidence >= 0.8 ? "#22C55E"
    : routerResult.confidence >= 0.6 ? "#F59E0B"
    : "#EF4444";

  return (
    <div className="smart-search-root" onPointerDown={e => e.stopPropagation()}>
      <style>{`
        .smart-search-root {
          position: sticky;
          top: 0;
          z-index: 100;
          background: transparent;
          padding: 14px 16px 0;
          max-width: 680px;
          margin: 0 auto;
          width: 100%;
        }
        .ss-wrapper {
          display: flex;
          align-items: center;
          background: var(--ss-bar-bg, rgba(12, 12, 20, 0.72));
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1.5px solid var(--color-border, #2a2a4a);
          border-radius: 28px;
          height: 52px;
          padding: 0 8px 0 20px;
          gap: 4px;
          transition: border-color 0.25s, box-shadow 0.25s;
          position: relative;
        }
        .ss-wrapper:focus-within {
          border-color: var(--color-accent, #6C63FF);
          box-shadow: 0 0 0 3px var(--hover-bg);
        }
        .ss-wrapper.loading {
          background: linear-gradient(90deg,
            var(--color-bg-surface,#1a1a2e) 25%,
            rgba(108,99,255,0.1) 50%,
            var(--color-bg-surface,#1a1a2e) 75%);
          background-size: 200% 100%;
          animation: ss-shimmer 1.4s ease infinite;
        }
        @keyframes ss-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .ss-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--color-text-primary, #e2e2f0);
          font-size: 15px;
          font-family: inherit;
          outline: none;
          min-width: 0;
        }
        .ss-input::placeholder { color: var(--color-text-muted, #666); }
        .ss-interim {
          position: absolute;
          left: 20px;
          top: 50%;
          transform: translateY(-50%);
          font-style: italic;
          color: #888;
          pointer-events: none;
          font-size: 15px;
        }
        .ss-icon-btn {
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%;
          border: none; background: transparent;
          cursor: pointer;
          color: var(--color-text-muted, #888);
          font-size: 16px;
          transition: background 0.2s, color 0.2s;
          flex-shrink: 0;
        }
        .ss-icon-btn:hover { background: var(--hover-bg); color: var(--color-accent); }
        .ss-icon-btn.active { color: #EF4444; background: rgba(239,68,68,0.1); }
        .ss-execute-btn {
          height: 38px;
          padding: 0 20px;
          background: var(--color-accent, #e91e8c);
          color: #fff;
          border: none;
          border-radius: 20px;
          font-weight: 700;
          font-family: 'Orbitron', sans-serif;
          font-size: 13px;
          cursor: pointer;
          transition: transform 0.2s, background-color 0.2s, opacity 0.2s;
          margin-left: 4px;
          margin-right: 4px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .ss-execute-btn:hover {
          opacity: 0.9;
          transform: scale(1.02);
        }
        .ss-execute-btn:active {
          transform: scale(0.98);
        }
        .ss-execute-btn:disabled {
          background: #555;
          color: #999;
          cursor: not-allowed;
        }
        .ss-suggestions {
          position: absolute;
          top: calc(100% + 6px);
          left: 0; right: 0;
          background: var(--color-bg-elevated, #16213e);
          border: 1px solid var(--color-border, #2a2a4a);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          z-index: 200;
        }
        .ss-suggestion-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px;
          cursor: pointer;
          font-size: 14px;
          color: var(--color-text-primary, #e2e2f0);
          transition: background 0.15s;
        }
        .ss-suggestion-item:hover { background: var(--hover-bg); }
        .ss-suggestion-cat {
          font-size: 10px; color: #888;
          background: var(--color-bg-surface, #1a1a2e);
          border-radius: 4px; padding: 2px 6px;
          margin-left: auto;
        }
        .ss-context-badge {
          display: flex; align-items: center; gap: 6px;
          margin-top: 8px;
          background: rgba(108,99,255,0.1);
          border: 1px solid rgba(108,99,255,0.25);
          border-radius: 20px;
          padding: 4px 12px;
          font-size: 12px;
          color: #a5b4fc;
          width: fit-content;
        }
        .ss-result-card {
          margin-top: 10px;
          background: var(--color-bg-elevated, #16213e);
          border: 1px solid var(--color-border, #2a2a4a);
          border-radius: 16px;
          overflow: hidden;
        }
        .ss-result-header {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--color-border, #2a2a4a);
        }
        .ss-conf-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
        }
        .ss-result-tool-name {
          font-weight: 600; font-size: 15px;
          color: var(--color-text-primary, #e2e2f0);
          flex: 1;
        }
        .ss-result-badge {
          font-size: 11px;
          background: var(--hover-bg);
          color: var(--color-accent);
          border-radius: 6px; padding: 2px 8px;
        }
        .ss-result-body { padding: 12px 16px; }
        .ss-reasoning {
          font-size: 12px; color: #888; margin-bottom: 10px; line-height: 1.5;
        }
        .ss-feedback-row {
          display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;
        }
        .ss-fb-btn {
          font-size: 12px; border: none; border-radius: 20px;
          padding: 5px 14px; cursor: pointer; transition: opacity 0.2s;
        }
        .ss-fb-btn:hover { opacity: 0.85; }
        .ss-clarification {
          margin-top: 10px;
          padding: 12px 16px;
          background: rgba(245,158,11,0.08);
          border: 1px dashed rgba(245,158,11,0.35);
          border-radius: 12px;
        }
        .ss-clarification p { font-size: 13px; margin-bottom: 8px; }
        .ss-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .ss-chip {
          font-size: 12px;
          background: var(--color-bg-surface, #1a1a2e);
          border: 1px solid var(--color-border, #2a2a4a);
          border-radius: 20px; padding: 5px 14px;
          cursor: pointer; transition: border-color 0.2s, color 0.2s;
          color: var(--color-text-primary, #e2e2f0);
        }
        .ss-chip:hover { border-color: var(--color-accent); color: var(--color-accent); }
        .ss-fallback-row {
          display: flex; flex-wrap: wrap; gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid var(--color-border, #2a2a4a);
        }
        .ss-trace-toggle {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 11px;
          color: #888;
          border-top: 1px solid var(--color-border, #2a2a4a);
          user-select: none;
        }
        .ss-trace-toggle:hover { color: var(--color-accent); }
        .ss-trace-body {
          padding: 10px 16px;
          font-family: "Fira Mono", "Consolas", monospace;
          font-size: 11px;
          background: rgba(0,0,0,0.25);
          color: #9ca3af;
          line-height: 1.7;
          border-top: 1px solid var(--color-border, #2a2a4a);
        }
        .ss-error {
          margin-top: 8px;
          padding: 10px 14px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.25);
          border-radius: 10px;
          font-size: 12px;
          color: #f87171;
        }
        .ss-navigate-btn {
          display: flex; align-items: center; gap: 6px;
          background: linear-gradient(135deg, #6C63FF, #8B5CF6);
          color: #fff; border: none;
          border-radius: 20px; padding: 6px 16px;
          font-size: 13px; cursor: pointer;
          transition: opacity 0.2s;
          white-space: nowrap;
        }
        .ss-navigate-btn:hover { opacity: 0.9; }
      `}</style>

      {/* ── Pending Feedback Banner ────────────────────────────────────── */}
      {pendingFeedback && (
        <div style={{
          marginBottom: 12,
          padding: "12px 16px",
          background: "linear-gradient(135deg, rgba(233,30,140,0.12), rgba(201,169,110,0.06))",
          border: "1px solid rgba(233,30,140,0.25)",
          borderRadius: 14,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--color-text-primary, #e2e2f0)", fontWeight: 500 }}>
              Did the AI route you to the correct tool for your last query? <br/>
              <span style={{ fontStyle: "italic", color: "#888" }}>"{pendingFeedback.query}"</span> &rarr; <strong style={{ color: "var(--color-accent, #e91e8c)" }}>{pendingFeedback.suggestedToolName}</strong>
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handlePendingFeedbackYes}
                style={{
                  background: "rgba(34,197,94,0.15)",
                  color: "#4ade80",
                  border: "none",
                  borderRadius: 12,
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <YesIconSVG /> Yes
              </button>
              <button
                type="button"
                onClick={handlePendingFeedbackNo}
                style={{
                  background: "rgba(239,68,68,0.12)",
                  color: "#f87171",
                  border: "none",
                  borderRadius: 12,
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <NoIconSVG /> No
              </button>
            </div>
          </div>

          {showPendingCorrection && (
            <div style={{
              marginTop: 4,
              borderTop: "1px solid rgba(255,255,255,0.08)",
              paddingTop: 8
            }}>
              <p style={{ fontSize: 11, color: "#f87171", marginBottom: 6, fontWeight: 600 }}>
                Please select the correct tool so the AI can learn:
              </p>
              <input
                type="text"
                placeholder="Search correct tool name..."
                value={pendingCorrectionSearch}
                onChange={e => setPendingCorrectionSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 12px",
                  fontSize: 12,
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "#fff",
                  outline: "none",
                  marginBottom: 8
                }}
              />
              <div style={{
                maxHeight: 120,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 4
              }}>
                {toolsRegistry
                  .filter(t => t.name.toLowerCase().includes(pendingCorrectionSearch.toLowerCase()))
                  .map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handlePendingCorrectionSelect(t.id)}
                      style={{
                        textAlign: "left",
                        padding: "6px 10px",
                        fontSize: 12,
                        background: "rgba(255,255,255,0.03)",
                        border: "none",
                        borderRadius: 6,
                        color: "#ccc",
                        cursor: "pointer",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                    >
                      {t.name} <span style={{ color: "#666", fontSize: 10 }}>({t.category})</span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Search bar ────────────────────────────────────────────────── */}
      <div className={`ss-wrapper${isLoading ? " loading" : ""}`} style={{ position: "relative" }}>
        <input
          ref={inputRef}
          id="smart-search-input"
          type="text"
          className="ss-input"
          placeholder={isListening ? "" : "Search tools or describe your task…"}
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          onPaste={handlePaste}
          autoComplete="off"
          aria-label="Search tools"
        />

        {isListening && interimTranscript && (
          <span className="ss-interim">{interimTranscript}</span>
        )}

        {/* Upload document */}
        <label className="ss-icon-btn" title="Upload document or image (PDF / DOCX / Image)">
          <input
            type="file"
            hidden
            accept=".pdf,.docx,.doc,.txt,text/plain,image/*"
            onChange={handleFileUpload}
          />
          <DocIconSVG />
        </label>

        {/* Voice */}
        <button
          type="button"
          className={`ss-icon-btn${isListening ? " active" : ""}`}
          onClick={toggleListening}
          title={isListening ? "Stop listening" : "Voice search"}
          aria-pressed={isListening}
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {isListening ? <StopIconSVG /> : <VoiceIconSVG />}
        </button>

        {/* Execute */}
        <button
          type="button"
          className="ss-execute-btn"
          onClick={() => handleSearch()}
          disabled={isLoading}
        >
          {isLoading ? "Parsing…" : "Execute"}
        </button>

        {/* ── Dropdown suggestions ─────────────────────────────────── */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="ss-suggestions" role="listbox">
            {suggestions.map(tool => (
              <div
                key={tool.id}
                className="ss-suggestion-item"
                role="option"
                aria-selected={false}
                onPointerDown={e => {
                  e.stopPropagation();
                  setQuery(tool.name);
                  setShowSuggestions(false);
                  handleSearch(tool.name);
                }}
              >
                <span>{tool.name}</span>
                <span className="ss-suggestion-cat">{tool.category}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Upload context badge ──────────────────────────────────────── */}
      {uploadContext && (
        <div className="ss-context-badge" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <AttachmentIconSVG />
          <span>{uploadContext.slice(0, 80)}</span>
          <button
            type="button"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 12, padding: 0 }}
            onClick={() => { setUploadContext(null); setUploadBase64(null); setUploadMimeType(null); }}
            aria-label="Clear upload context"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────── */}
      {errorMsg && <div className="ss-error"><ErrorIconSVG /> {errorMsg}</div>}

      {/* ── Result card ───────────────────────────────────────────────── */}
      {routerResult && !isLoading && (
        <div className="ss-result-card" role="region" aria-label="Search result">

          {/* Header */}
          {routerResult.primaryTool && (
            <div className="ss-result-header">
              <div
                className="ss-conf-dot"
                style={{ background: confidenceColor }}
                title={`Confidence: ${Math.round(routerResult.confidence * 100)}%`}
              />
              <span className="ss-result-tool-name">
                {routerResult.primaryTool.tool.name}
              </span>
              <span className="ss-result-badge">
                {routerResult.source === "local"  ? "⚡ instant"  :
                 routerResult.source === "cache"  ? "📦 cached"   :
                 routerResult.source === "gemini" ? "✨ AI"        : "🔍 fuzzy"}
              </span>
              <button
                type="button"
                className="ss-navigate-btn"
                onClick={() =>
                  routerResult.primaryTool &&
                  navigate(routerResult.primaryTool.tool.route, {
                    state: {
                      params: routerResult.primaryTool.prefillData,
                      aiPayload: routerResult.primaryTool.prefillData
                    }
                  })
                }
                aria-label={`Open ${routerResult.primaryTool.tool.name}`}
              >
                Open →
              </button>
            </div>
          )}

          {/* Body: feedback */}
          <div className="ss-result-body">

            {/* RLHF feedback */}
            {routerResult.primaryTool && !feedbackGiven && (
              <div className="ss-feedback-row" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#888", alignSelf: "center" }}>Was this right?</span>
                <button
                  type="button"
                  className="ss-fb-btn"
                  style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", display: "inline-flex", alignItems: "center" }}
                  onClick={() => handleFeedback(true)}
                >
                  <YesIconSVG /> Yes
                </button>
                <button
                  type="button"
                  className="ss-fb-btn"
                  style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", display: "inline-flex", alignItems: "center" }}
                  onClick={() => {
                    setShowCorrectionPicker(true);
                  }}
                >
                  <NoIconSVG /> No
                </button>
              </div>
            )}

            {/* Correction picker — shown after "No" */}
            {showCorrectionPicker && routerResult.primaryTool && !feedbackGiven && (
              <div style={{
                marginTop: 10,
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 12,
                padding: "12px",
              }}>
                <p style={{ fontSize: 11, color: "#f87171", marginBottom: 8, fontWeight: 600, display: "flex", alignItems: "center" }}>
                  <BrainIconSVG /> Pick the correct tool — AI will learn this:
                </p>
                <input
                  type="text"
                  placeholder="Search tools…"
                  value={correctionSearch}
                  onChange={e => setCorrectionSearch(e.target.value)}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8, padding: "6px 10px",
                    color: "#e2e2f0", fontSize: 12,
                    marginBottom: 8, boxSizing: "border-box",
                  }}
                  autoFocus
                />
                <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {toolsRegistry
                    .filter(t => t.name.toLowerCase().includes(correctionSearch.toLowerCase()) ||
                                 t.keywords.some(k => k.toLowerCase().includes(correctionSearch.toLowerCase())))
                    .slice(0, 20)
                    .map(tool => (
                      <button
                        key={tool.id}
                        type="button"
                        className="ss-chip"
                        style={{ fontSize: 11 }}
                        onClick={async () => {
                          await handleFeedback(false, tool.id);
                          setShowCorrectionPicker(false);
                          navigate(tool.route, { state: { params: {}, aiPayload: {} } });
                        }}
                      >
                        {tool.name}
                      </button>
                    ))
                  }
                </div>
              </div>
            )}

            {/* Correction chips */}
            {!feedbackGiven && routerResult.suggestedAlternatives.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>
                  Did you mean:
                </p>
                <div className="ss-chips">
                  {routerResult.suggestedAlternatives.map(alt => (
                    <button
                      type="button"
                      key={alt.id}
                      className="ss-chip"
                      onClick={async () => {
                        if (routerResult.primaryTool) {
                          await handleFeedback(false, alt.id);
                        }
                        navigate(alt.route);
                      }}
                    >
                      {alt.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Clarification box */}
          {routerResult.clarificationNeeded && routerResult.clarificationQuestion && (
            <div className="ss-clarification">
              <p>❓ {routerResult.clarificationQuestion}</p>
              <div className="ss-chips">
                {routerResult.suggestedAlternatives.map(alt => (
                  <button
                    type="button"
                    key={alt.id}
                    className="ss-chip"
                    onClick={() => navigate(alt.route)}
                  >
                    {alt.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fuzzy fallback grid */}
          {routerResult.mode === "fallback" && routerResult.fallbackResults.length > 0 && (
            <div className="ss-fallback-row">
              <p style={{ width: "100%", fontSize: 11, color: "#888", marginBottom: 4 }}>
                Top matches:
              </p>
              {routerResult.fallbackResults.map(tool => (
                <button
                  type="button"
                  key={tool.id}
                  className="ss-chip"
                  onClick={() => navigate(tool.route)}
                >
                  {tool.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* bottom spacer so the sticky header doesn't clip content */}
      <div style={{ height: 14 }} />
    </div>
  );
};

export default SmartSearch;
