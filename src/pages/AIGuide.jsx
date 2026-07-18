import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeContext } from '../context/ThemeContext';
import BackButton from '../components/BackButton';

const GUIDE_SECTIONS = [
  {
    id: 'what-is',
    icon: '🤖',
    title: 'What is ToolKit AI?',
    color: '#e91e8c',
    steps: [
      {
        heading: 'Your Universal Smart Assistant',
        body: 'ToolKit AI is a professional productivity toolkit with 67+ tools powered by an AI brain. Instead of hunting through menus, you simply type what you want in plain English — and the AI instantly routes you to the right tool with your inputs pre-filled.',
        example: null,
      },
      {
        heading: 'Three Layers of Intelligence',
        body: 'The AI uses three routing strategies in order of speed: ⚡ Instant local pattern matching (< 2ms), 📦 Cached results from past queries, and ✨ Google Gemini 2.5 Flash for complex queries. This means most requests resolve instantly without hitting any API.',
        example: null,
      },
    ],
  },
  {
    id: 'basic-queries',
    icon: '💬',
    title: 'Basic Queries',
    color: '#00d4ff',
    steps: [
      {
        heading: 'Just describe what you want',
        body: 'Type your query naturally. The AI understands plain English, abbreviations, and partial sentences.',
        example: { query: 'BMI for 70kg 175cm', result: '→ Opens BMI Calculator with weight and height pre-filled' },
      },
      {
        heading: 'Use the tool name directly',
        body: 'You can always type the tool name directly to navigate instantly.',
        example: { query: 'stopwatch', result: '→ Opens Stopwatch immediately' },
      },
      {
        heading: 'Describe a task, not just a tool',
        body: 'The AI understands intent, not just keywords.',
        example: { query: 'how loud is it in this room', result: '→ Opens Noise Detector' },
      },
    ],
  },
  {
    id: 'prefill',
    icon: '⚡',
    title: 'Automatic Value Prefill',
    color: '#c9a96e',
    steps: [
      {
        heading: 'Values are extracted and pre-filled automatically',
        body: 'When you include numbers or specifics in your query, the AI extracts them and pre-fills the tool inputs. No need to type them again.',
        example: { query: 'convert 587 EUR to INR', result: '→ Currency Converter opens with 587, EUR→INR pre-filled' },
      },
      {
        heading: 'Works for time, money, health, and more',
        body: 'The AI extracts: amounts, percentages, time durations, currencies, units, dates, temperatures, distances, and more.',
        example: { query: 'timer for 25 minutes', result: '→ Timer starts at 25:00 automatically' },
      },
      {
        heading: 'Complex natural language',
        body: 'You can write queries exactly as you would say them.',
        example: { query: 'What is 15% of 4500?', result: '→ Percentage Calculator with 15 and 4500 pre-filled' },
      },
    ],
  },
  {
    id: 'multi-tool',
    icon: '🔀',
    title: 'Multi-Tool Queries',
    color: '#00ff88',
    steps: [
      {
        heading: 'Ask for two things at once',
        body: 'When your query involves multiple tools, the AI opens a split-screen workspace showing both tools simultaneously.',
        example: { query: 'check my BMI and track my water intake today', result: '→ BMI Calculator + Water Tracker open side by side' },
      },
      {
        heading: 'Use trigger words like "and", "also", "both"',
        body: 'The AI listens for combination signals to detect multi-tool intent.',
        example: { query: 'I want to set a timer and also check the weather', result: '→ Timer + Weather open in split view' },
      },
      {
        heading: 'Full screen any panel',
        body: 'In the multi-tool workspace, click "Full Screen ↗" on any panel to expand that tool to full screen.',
        example: null,
      },
    ],
  },
  {
    id: 'ai-learning',
    icon: '🧠',
    title: 'AI Learning & Feedback',
    color: '#f59e0b',
    steps: [
      {
        heading: 'The AI learns from your corrections',
        body: 'After every search result, you\'ll see "Was this right?" buttons. Tapping ✓ Yes reinforces the correct routing. Tapping ✗ No lets you pick the right tool — the AI records this and uses it for future queries.',
        example: null,
      },
      {
        heading: 'Check your AI insights',
        body: 'Go to AI Insights (⚡ icon in sidebar) to see how many corrections you\'ve made, which tool was most often mis-routed, and what preferences the AI has learned.',
        example: null,
      },
      {
        heading: 'The AI gets smarter with every session',
        body: 'Your feedback is stored locally and injected as few-shot examples into Gemini prompts. Over time, the AI builds a personal routing profile specific to how you describe things.',
        example: null,
      },
    ],
  },
  {
    id: 'voice',
    icon: '🎤',
    title: 'Voice & File Input',
    color: '#8b5cf6',
    steps: [
      {
        heading: 'Voice search with the mic button',
        body: 'Click the 🎤 button in the search bar to speak your query. The AI listens in real-time and routes to the tool after you stop speaking (1.5s silence detection).',
        example: null,
      },
      {
        heading: 'Upload a document for context',
        body: 'Click the 📄 button to upload a PDF, DOCX, or TXT file. The AI reads the document and routes to the most relevant tool based on the content.',
        example: null,
      },
      {
        heading: 'Upload an image for AI vision routing',
        body: 'Click the 📷 button to upload an image. Gemini Vision analyzes the image and picks the right tool (e.g., uploading a food photo → Nutrition Expert).',
        example: null,
      },
    ],
  },
  {
    id: 'tips',
    icon: '💡',
    title: 'Pro Tips',
    color: '#ff6b35',
    steps: [
      {
        heading: 'Use recent queries',
        body: 'Your recent queries appear in the sidebar under "Recents". Click any item to re-run it instantly.',
        example: null,
      },
      {
        heading: 'Browse all tools',
        body: 'Tap "Tools" in the sidebar to see all 67 tools organized by category. Each tool card shows what it does.',
        example: null,
      },
      {
        heading: 'Suggested prompts on the home screen',
        body: 'The home screen shows suggested prompts you can tap to try immediately. These update based on time of day and your usage.',
        example: null,
      },
      {
        heading: 'The search bar stays sticky at the top',
        body: 'The AI search bar is always visible as you scroll. You never need to go back to the home screen to start a new query.',
        example: null,
      },
    ],
  },
];

const EXAMPLE_QUERIES = [
  // Calculative
  { query: '70 kg 175 cm BMI', tool: 'BMI Calculator', color: '#EC4899' },
  { query: 'discount 45% of 8000', tool: 'Discount Calculator', color: '#EF4444' },
  { query: 'calculate 678 * 345 / 6448', tool: 'Calculator', color: '#F59E0B' },
  { query: 'what is 15% of 4500', tool: 'Percentage Calculator', color: '#8B5CF6' },
  { query: 'increase 1200 by 25%', tool: 'Percentage Calculator', color: '#8B5CF6' },
  { query: 'calculate compound interest', tool: 'Interest Calculator', color: '#EC4899' },
  { query: 'fuel efficiency 15km/l for 450km at 108 rs', tool: 'Fuel Calculator', color: '#EF4444' },
  { query: 'mutual funds return for 5000 sip', tool: 'Mutual Fund', color: '#F97316' },
  { query: 'EMI for 10 lakh loan', tool: 'EMI Calculator', color: '#c9a96e' },
  { query: 'check the age for 4th December 2004', tool: 'Age Calculator', color: '#10B981' },

  // Tools & Devices
  { query: 'turn on flashlight', tool: 'Flashlight', color: '#3B82F6' },
  { query: 'start voice recorder', tool: 'Audio Recorder', color: '#00ff88' },
  { query: 'translate hello to Spanish', tool: 'Translator', color: '#00d4ff' },
  { query: 'send whatsapp to 9876543210 with message hello', tool: 'WhatsApp Direct', color: '#10B981' },
  { query: 'weather in London', tool: 'Weather', color: '#3B82F6' },
  { query: 'shatter sunset sample', tool: 'Color Picker', color: '#F97316' },
  
  // Time & Date
  { query: 'set timer for 23 min 56 sec', tool: 'Timer', color: '#3B82F6' },
  { query: 'check London time offset', tool: 'TimeZone Converter', color: '#8B5CF6' },
  { query: 'leap year check 2028', tool: 'Leap Year', color: '#00d4ff' },

  // Text / Docs
  { query: 'extract text from image', tool: 'Text Scanner', color: '#10B981' },
  { query: 'convert pdf to word', tool: 'PDF ↔ Word', color: '#F97316' },
  { query: 'convert word to pdf', tool: 'Word ↔ PDF', color: '#EC4899' },

  // Multi-Tool
  { query: 'BMI and water intake', tool: 'Multi-Tool: BMI + Hydration', color: '#e91e8c' },
  { query: 'check storage and battery', tool: 'Multi-Tool: Storage + Battery', color: '#6366F1' },
];

export default function AIGuide() {
  const navigate = useNavigate();
  const themeContext = useContext(ThemeContext);
  const tokens = themeContext?.tokens;
  const [activeSection, setActiveSection] = useState('what-is');
  const [copiedQuery, setCopiedQuery] = useState('');

  const handleTryQuery = (query) => {
    navigate(`/?q=${encodeURIComponent(query)}`);
  };

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleCopy = async (query) => {
    await navigator.clipboard.writeText(query).catch(() => {});
    setCopiedQuery(query);
    setTimeout(() => setCopiedQuery(''), 2000);
  };

  const currentSection = GUIDE_SECTIONS.find(s => s.id === activeSection) || GUIDE_SECTIONS[0];

  return (
    <div style={{
      minHeight: '100vh',
      background: tokens?.background || '#080f18',
      color: tokens?.textPrimary || '#e2e2f0',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <style>{`
        .guide-nav-item:hover { background: var(--hover-bg, rgba(255,255,255,0.06)) !important; }
        .guide-step-card:hover { border-color: var(--accent-color, rgba(255,255,255,0.12)) !important; transform: translateY(-1px); }
        .guide-ex-card:hover { border-color: var(--accent-color, rgba(255,255,255,0.15)) !important; }
        .guide-scroll::-webkit-scrollbar { width: 4px; }
        .guide-scroll::-webkit-scrollbar-thumb { background: var(--accent-color, rgba(233,30,140,0.4)); border-radius: 2px; }
      `}</style>

      {/* Page header */}
      <div style={{
        padding: '20px 28px',
        borderBottom: `1px solid ${tokens?.border || 'rgba(255,255,255,0.06)'}`,
        display: 'flex', alignItems: 'center', gap: '16px',
        background: tokens?.surface ? `${tokens.surface}e0` : 'rgba(8,15,24,0.8)',
        backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <BackButton />
        <div>
          <h1 style={{
            margin: 0,
            fontSize: 'clamp(38px, 7vw, 62px)',
            fontWeight: '900',
            fontFamily: "'Orbitron', sans-serif",
            background: 'linear-gradient(135deg, #e91e8c 0%, #ff6b35 40%, #c9a96e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '2px',
          }}>
            MADY GUIDE
          </h1>
          <p style={{ margin: '2px 0 0', color: tokens?.textSecondary || '#888', fontSize: '12px' }}>
            Complete guide to using ToolKit Mady chat
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'linear-gradient(135deg, #e91e8c, #c9a96e)',
              border: 'none', borderRadius: '20px',
              color: '#fff', padding: '8px 20px',
              fontSize: '12px', fontWeight: '700',
              cursor: 'pointer', fontFamily: "'Orbitron', sans-serif",
              letterSpacing: '0.3px',
            }}
          >
            Try AI Chat →
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 72px)' }}>
        {/* Sidebar nav */}
        <div style={{
          width: '220px', flexShrink: 0,
          borderRight: `1px solid ${tokens?.border || 'rgba(255,255,255,0.06)'}`,
          padding: '20px 12px',
          background: tokens?.surface ? `${tokens.surface}80` : 'rgba(8,15,24,0.5)',
          display: 'flex', flexDirection: 'column', gap: '4px',
          position: 'sticky', top: '72px',
          height: 'calc(100vh - 72px)', overflowY: 'auto',
        }}>
          {GUIDE_SECTIONS.map(section => (
            <button
              key={section.id}
              className="guide-nav-item"
              onClick={() => setActiveSection(section.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '10px',
                border: activeSection === section.id
                  ? `1px solid ${section.color}40`
                  : '1px solid transparent',
                background: activeSection === section.id
                  ? `${section.color}12`
                  : 'transparent',
                cursor: 'pointer',
                textAlign: 'left', width: '100%',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: '16px' }}>{section.icon}</span>
              <span style={{
                fontSize: '12px', fontWeight: activeSection === section.id ? '700' : '500',
                color: activeSection === section.id ? section.color : (tokens?.textSecondary || '#888'),
                lineHeight: '1.3',
              }}>
                {section.title}
              </span>
            </button>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: '28px 32px', overflow: 'auto' }} className="guide-scroll">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
            >
              {/* Section header */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '28px' }}>{currentSection.icon}</span>
                  <h2 style={{
                    margin: 0, fontSize: '22px', fontWeight: '800',
                    fontFamily: "'Orbitron', sans-serif",
                    color: currentSection.color, letterSpacing: '0.5px',
                  }}>
                    {currentSection.title}
                  </h2>
                </div>
                <div style={{ height: '2px', background: `linear-gradient(90deg, ${currentSection.color}60, transparent)`, borderRadius: '1px' }} />
              </div>

              {/* Steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '36px' }}>
                {currentSection.steps.map((step, i) => (
                  <motion.div
                    key={i}
                    className="guide-step-card"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    style={{
                      background: tokens?.inputBg || 'rgba(15,22,38,0.8)',
                      border: `1px solid ${tokens?.border || 'rgba(255,255,255,0.07)'}`,
                      borderRadius: '16px',
                      padding: '20px 24px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '8px',
                        background: `${currentSection.color}20`,
                        border: `1px solid ${currentSection.color}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: '800', color: currentSection.color,
                        flexShrink: 0, fontFamily: "'Orbitron', sans-serif",
                      }}>
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: '700', color: tokens?.textPrimary || '#e2e2f0' }}>
                          {step.heading}
                        </h3>
                        <p style={{ margin: 0, fontSize: '13px', color: tokens?.textSecondary || '#888', lineHeight: '1.7' }}>
                          {step.body}
                        </p>
                        {step.example && (
                          <div style={{
                            marginTop: '14px',
                            background: tokens?.background || 'rgba(0,0,0,0.3)',
                            border: `1px solid ${tokens?.border || 'rgba(255,255,255,0.08)'}`,
                            borderRadius: '12px',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              padding: '8px 14px',
                              borderBottom: `1px solid ${tokens?.border || 'rgba(255,255,255,0.06)'}`,
                              background: tokens?.surface || 'rgba(255,255,255,0.03)',
                              display: 'flex', alignItems: 'center', gap: '8px',
                            }}>
                              <span style={{ fontSize: '10px', color: tokens?.textSecondary || '#888', fontFamily: 'monospace', letterSpacing: '1px' }}>
                                EXAMPLE
                              </span>
                            </div>
                            <div style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '11px', color: tokens?.textSecondary || '#888', fontFamily: 'monospace', flexShrink: 0, marginTop: '1px' }}>
                                  Query:
                                </span>
                                <code style={{
                                  fontSize: '13px', color: currentSection.color,
                                  background: `${currentSection.color}10`,
                                  border: `1px solid ${currentSection.color}25`,
                                  borderRadius: '8px', padding: '2px 10px',
                                  fontFamily: 'monospace',
                                }}>
                                  "{step.example.query}"
                                </code>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <span style={{ fontSize: '11px', color: tokens?.textSecondary || '#888', fontFamily: 'monospace', flexShrink: 0, marginTop: '1px' }}>
                                  Result:
                                </span>
                                <span style={{ fontSize: '13px', color: '#10B981' }}>
                                  {step.example.result}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Navigation buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                {GUIDE_SECTIONS.indexOf(currentSection) > 0 && (
                  <button
                    onClick={() => setActiveSection(GUIDE_SECTIONS[GUIDE_SECTIONS.indexOf(currentSection) - 1].id)}
                    style={{
                      background: tokens?.inputBg || 'rgba(255,255,255,0.06)',
                      border: `1px solid ${tokens?.border || 'rgba(255,255,255,0.1)'}`,
                      color: tokens?.textSecondary || '#888', borderRadius: '12px', padding: '10px 20px',
                      fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                    }}
                  >
                    ← Previous
                  </button>
                )}
                {GUIDE_SECTIONS.indexOf(currentSection) < GUIDE_SECTIONS.length - 1 && (
                  <button
                    onClick={() => setActiveSection(GUIDE_SECTIONS[GUIDE_SECTIONS.indexOf(currentSection) + 1].id)}
                    style={{
                      background: `linear-gradient(135deg, ${currentSection.color}, ${currentSection.color}aa)`,
                      border: 'none', borderRadius: '12px', padding: '10px 20px',
                      color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                      marginLeft: 'auto',
                    }}
                  >
                    Next →
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right panel: quick reference queries */}
        <div style={{
          width: '260px', flexShrink: 0,
          borderLeft: `1px solid ${tokens?.border || 'rgba(255,255,255,0.06)'}`,
          padding: '20px 16px',
          background: tokens?.surface ? `${tokens.surface}80` : 'rgba(8,15,24,0.5)',
          position: 'sticky', top: '72px',
          height: 'calc(100vh - 72px)', overflowY: 'auto',
        }} className="guide-scroll">
          <h3 style={{
            margin: '0 0 16px',
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '11px', fontWeight: '800',
            color: tokens?.textSecondary || '#888', letterSpacing: '1px',
          }}>
            EXAMPLE QUERIES
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {EXAMPLE_QUERIES.map((ex, i) => (
              <motion.div
                key={i}
                className="guide-ex-card"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{
                  background: tokens?.inputBg || 'rgba(15,22,38,0.8)',
                  border: `1px solid ${tokens?.border || 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '12px',
                  padding: '10px 12px',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
                onClick={() => handleTryQuery(ex.query)}
              >
                <div style={{
                  fontSize: '12px', color: ex.color,
                  fontFamily: 'monospace',
                  marginBottom: '4px',
                  lineHeight: '1.4',
                }}>
                  "{ex.query}"
                </div>
                <div style={{
                  fontSize: '10px', color: tokens?.textSecondary || '#888',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span>{ex.tool}</span>
                  <button
                     onClick={e => { e.stopPropagation(); handleCopy(ex.query); }}
                     style={{
                       background: 'none', border: 'none',
                       color: copiedQuery === ex.query ? '#10B981' : (tokens?.textSecondary || '#888'),
                       cursor: 'pointer', fontSize: '10px', padding: 0,
                     }}
                  >
                    {copiedQuery === ex.query ? '✓ copied' : '📋'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
          <div style={{ marginTop: '20px', padding: '12px', background: `${tokens?.accent || '#e91e8c'}08`, border: `1px solid ${tokens?.accent || '#e91e8c'}20`, borderRadius: '12px' }}>
            <p style={{ margin: 0, fontSize: '11px', color: tokens?.textSecondary || '#888', lineHeight: '1.6' }}>
              💡 Click any example to try it in the AI chat, or copy it to paste yourself.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
