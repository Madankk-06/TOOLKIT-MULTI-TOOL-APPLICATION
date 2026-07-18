import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';
import { useTheme } from '../../context/ThemeContext';
import { AIService } from '../../services/AIService';

const LANGUAGES = [
  // Indian Languages
  { code: 'hi', name: 'Hindi (हिंदी)', aliases: ['hindi', 'hin'] },
  { code: 'bn', name: 'Bengali (বাংলা)', aliases: ['bengali', 'bangla', 'ben'] },
  { code: 'te', name: 'Telugu (తెలుగు)', aliases: ['telugu', 'tel'] },
  { code: 'mr', name: 'Marathi (मराठी)', aliases: ['marathi', 'mar'] },
  { code: 'ta', name: 'Tamil (தமிழ்)', aliases: ['tamil', 'tam'] },
  { code: 'gu', name: 'Gujarati (ગુજરાતી)', aliases: ['gujarati', 'guj'] },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)', aliases: ['kannada', 'kan'] },
  { code: 'ml', name: 'Malayalam (മലയാളം)', aliases: ['malayalam', 'mal'] },
  { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)', aliases: ['punjabi', 'pan'] },
  { code: 'or', name: 'Odia (ଓଡ଼ିଆ)', aliases: ['odia', 'odiya', 'oriya'] },
  { code: 'as', name: 'Assamese (অসমীয়া)', aliases: ['assamese', 'asm'] },
  { code: 'ur', name: 'Urdu (اردو)', aliases: ['urdu', 'urd'] },
  { code: 'sa', name: 'Sanskrit (संस्कृतम्)', aliases: ['sanskrit', 'san'] },
  // Global Languages
  { code: 'en', name: 'English', aliases: ['english', 'eng', 'en'] },
  { code: 'es', name: 'Spanish (Español)', aliases: ['spanish', 'espanol', 'esp', 'spa'] },
  { code: 'fr', name: 'French (Français)', aliases: ['french', 'francais', 'fra', 'fre'] },
  { code: 'de', name: 'German (Deutsch)', aliases: ['german', 'deutsch', 'deu', 'ger'] },
  { code: 'it', name: 'Italian (Italiano)', aliases: ['italian', 'italiano', 'ita'] },
  { code: 'pt', name: 'Portuguese (Português)', aliases: ['portuguese', 'portugues', 'por'] },
  { code: 'ja', name: 'Japanese (日本語)', aliases: ['japanese', 'japan', 'jpn', 'ja'] },
  { code: 'ko', name: 'Korean (한국어)', aliases: ['korean', 'korea', 'kor', 'ko'] },
  { code: 'zh', name: 'Chinese (中文)', aliases: ['chinese', 'china', 'mandarin', 'zho', 'zh'] },
  { code: 'ar', name: 'Arabic (العربية)', aliases: ['arabic', 'arab', 'ara'] },
  { code: 'ru', name: 'Russian (Русский)', aliases: ['russian', 'rus'] },
  { code: 'tr', name: 'Turkish (Türkçe)', aliases: ['turkish', 'turk', 'tur'] },
  { code: 'vi', name: 'Vietnamese (Tiếng Việt)', aliases: ['vietnamese', 'vietnam', 'vie'] },
  { code: 'th', name: 'Thai (ภาษาไทย)', aliases: ['thai', 'tha'] },
  { code: 'nl', name: 'Dutch (Nederlands)', aliases: ['dutch', 'netherlands', 'nld'] },
  { code: 'pl', name: 'Polish (Polski)', aliases: ['polish', 'poland', 'pol'] },
  { code: 'sv', name: 'Swedish (Svenska)', aliases: ['swedish', 'sweden', 'swe'] },
  { code: 'el', name: 'Greek (Ελληνικά)', aliases: ['greek', 'greece', 'ell'] },
  { code: 'he', name: 'Hebrew (עברית)', aliases: ['hebrew', 'israel', 'heb'] },
  { code: 'id', name: 'Indonesian (Bahasa Indonesia)', aliases: ['indonesian', 'indonesia', 'ind'] },
  { code: 'ms', name: 'Malay (Bahasa Melayu)', aliases: ['malay', 'malaysia', 'msa'] },
  { code: 'fil', name: 'Filipino (Filipino)', aliases: ['filipino', 'tagalog', 'philippines', 'fil'] },
  { code: 'sw', name: 'Swahili (Kiswahili)', aliases: ['swahili', 'swa'] },
];

export default function Translator(props?: any) {
  const location = useLocation();
  const [text, setText] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('hi');
  const [translated, setTranslated] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const { tokens } = useTheme();

  /** Resolve a language name/alias/code string to a LANGUAGES code */
  const resolveLanguageCode = (input: string): string => {
    if (!input) return 'hi';
    const q = input.trim().toLowerCase();
    // Direct code match
    const byCode = LANGUAGES.find(l => l.code.toLowerCase() === q);
    if (byCode) return byCode.code;
    // Alias match
    const byAlias = LANGUAGES.find(l => (l as any).aliases?.some((a: string) => a === q || q.startsWith(a)));
    if (byAlias) return byAlias.code;
    // Partial name match
    const byName = LANGUAGES.find(l => l.name.toLowerCase().includes(q));
    if (byName) return byName.code;
    return 'hi';
  };

  const getLanguageName = (code: string) => {
    return LANGUAGES.find(l => l.code === code)?.name || code;
  };

  const translate = useCallback(async (textToTranslate = text, srcCode = sourceLang, tgtCode = targetLang) => {
    if (!textToTranslate.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const srcName = getLanguageName(srcCode);
      const tgtName = getLanguageName(tgtCode);
      
      // Try Gemini translation for premium context and best accuracy in Indian languages
      try {
        const result = await AIService.translate(textToTranslate, srcName, tgtName);
        if (result && result.trim()) {
          setTranslated(result.trim());
          setLoading(false);
          return;
        }
      } catch (geminiError) {
        console.warn("Gemini translation failed, falling back to MyMemory API:", geminiError);
      }

      // Fallback: Using MyMemory API (free, no key required)
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=${srcCode}|${tgtCode}`);
      const data = await res.json();
      if (data.responseData) {
        setTranslated(data.responseData.translatedText);
      } else {
        throw new Error("Translation failed.");
      }
    } catch (e) {
      setError("Translation service unavailable. Please try again later.");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, sourceLang, targetLang]);

  useEffect(() => {
    let data = null;
        if (props && (props.params || props.aiPayload)) {
          data = props.params || props.aiPayload;
        } else if (location.state && (location.state.aiPayload || location.state.params)) {
          data = location.state.aiPayload || location.state.params;
        } else if (props && Object.keys(props).some(k => k !== 'standalone')) {
          data = props;
        }
    if (data) {
      const textVal = data.text || data.textToTranslate || '';
      const fromVal = data.sourceLang || data.from || '';
      const toVal = data.targetLanguage || data.targetLang || data.to || data.language || '';

      const srcCode = fromVal ? resolveLanguageCode(String(fromVal)) : 'en';
      const tgtCode = toVal ? resolveLanguageCode(String(toVal)) : 'hi';

      if (textVal) {
        const cleanText = String(textVal);
        setText(cleanText);
        setSourceLang(srcCode);
        setTargetLang(tgtCode);
        translate(cleanText, srcCode, tgtCode);
      } else if (toVal) {
        // Just set the target language even if no text yet
        setTargetLang(tgtCode);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(translated).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const swap = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setText(translated);
    setTranslated(text);
  };

  return (
    <ToolWrapper toolName="Translator">
      <div style={styles.container}>
        <div style={{ ...styles.card, background: tokens.surface, borderColor: tokens.border }}>
          <div style={styles.header}>
            <select 
              value={sourceLang} 
              onChange={e => setSourceLang(e.target.value)} 
              style={{ ...styles.select, background: tokens.inputBg, color: tokens.textPrimary, borderColor: tokens.border }}
            >
              {LANGUAGES.map(l => <option key={l.code} value={l.code} style={{ background: tokens.surface, color: tokens.textPrimary }}>{l.name}</option>)}
            </select>
            
            <motion.button 
              onClick={swap} 
              style={{ ...styles.swapBtn, background: tokens.inputBg, color: tokens.accent, borderColor: tokens.border }} 
              whileTap={{ scale: 0.9 }}
            >
              ⇄
            </motion.button>
            
            <select 
              value={targetLang} 
              onChange={e => setTargetLang(e.target.value)} 
              style={{ ...styles.select, background: tokens.inputBg, color: tokens.textPrimary, borderColor: tokens.border }}
            >
              {LANGUAGES.map(l => <option key={l.code} value={l.code} style={{ background: tokens.surface, color: tokens.textPrimary }}>{l.name}</option>)}
            </select>
          </div>

          <div style={styles.inputArea}>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Enter text to translate..."
              style={{ ...styles.textarea, background: tokens.inputBg, color: tokens.textPrimary, borderColor: tokens.border }}
            />
            <button 
              onClick={() => translate()} 
              disabled={loading} 
              style={{ ...styles.translateBtn, background: `linear-gradient(135deg, ${tokens.accent}, #8B5CF6)` }}
            >
              {loading ? 'Translating...' : 'Translate'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {translated && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              style={{ ...styles.resultCard, background: tokens.surface, borderColor: tokens.accent }}
            >
              <div style={{ ...styles.resultLabel, color: tokens.textSecondary }}>Translation → {getLanguageName(targetLang)}</div>
              <div style={{ ...styles.resultText, color: tokens.textPrimary }}>{translated}</div>
              <button 
                onClick={copyToClipboard} 
                style={{ ...styles.copyBtn, background: copied ? 'rgba(34,197,94,0.15)' : tokens.inputBg, borderColor: copied ? '#22C55E' : tokens.border, color: copied ? '#22C55E' : tokens.textSecondary }}
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {error && <div style={styles.error}>{error}</div>}
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px', margin: '0 auto', padding: '10px' },
  card: { border: '1px solid', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' },
  header: { display: 'flex', alignItems: 'center', gap: '12px' },
  select: {
    flex: 1, border: '1px solid', borderRadius: '10px',
    padding: '12px', fontSize: '14px', outline: 'none', cursor: 'pointer'
  },
  swapBtn: {
    border: '1px solid', borderRadius: '50%',
    width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
  },
  inputArea: { display: 'flex', flexDirection: 'column', gap: '12px' },
  textarea: {
    width: '100%', height: '140px', border: '1px solid',
    borderRadius: '12px', padding: '16px', fontSize: '16px', outline: 'none', resize: 'none'
  },
  translateBtn: {
    border: 'none', borderRadius: '12px',
    color: '#fff', fontWeight: 'bold', padding: '14px', cursor: 'pointer', fontSize: '15px'
  },
  resultCard: { 
    border: '1px solid', 
    borderRadius: '20px', padding: '24px', position: 'relative', boxShadow: '0 8px 24px rgba(0,0,0,0.04)' 
  },
  resultLabel: { fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold', letterSpacing: '0.5px' },
  resultText: { fontSize: '18px', lineHeight: 1.5, paddingRight: '40px', wordBreak: 'break-word' },
  copyBtn: {
    position: 'absolute', top: '16px', right: '16px',
    border: '1px solid', borderRadius: '6px',
    fontSize: '11px', padding: '4px 8px', cursor: 'pointer', fontWeight: 'bold'
  },
  error: { color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '12px', fontSize: '13px', textAlign: 'center' }
};
