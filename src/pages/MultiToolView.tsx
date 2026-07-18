/**
 * FILE: src/pages/MultiToolView.tsx
 *
 * Premium split-screen multi-tool view.
 * Navigated to when SmartSearch detects a multi-tool query.
 * Shows 2 tools side-by-side in embedded panels with full interaction.
 */

import React, { Suspense, lazy, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ThemeContext } from '../context/ThemeContext';
import BackButton from '../components/BackButton';

// ── Lazy-load all tool components for embedding ─────────────────
const toolComponentMap: Record<string, React.LazyExoticComponent<React.ComponentType<unknown>>> = {
  'analog-clock':              lazy(() => import('../tools/timeanddate/AnalogClock')),
  'digital-clock':             lazy(() => import('../tools/timeanddate/DigitalClock')),
  'stopwatch':                 lazy(() => import('../tools/timeanddate/Stopwatch')),
  'timer':                     lazy(() => import('../tools/timeanddate/Timer')),
  'leap-year':                 lazy(() => import('../tools/timeanddate/LeapYear')),
  'time-zone':                 lazy(() => import('../tools/timeanddate/TimeZone')),
  'calculator':                lazy(() => import('../tools/calculative/Calculator')),
  'bmi-calculator':            lazy(() => import('../tools/calculative/BMICalculator')),
  'age-calculator':            lazy(() => import('../tools/calculative/AgeCalculator')),
  'discount-calculator':       lazy(() => import('../tools/calculative/DiscountCalculator')),
  'percentage-calculator':     lazy(() => import('../tools/calculative/PercentageCalculator')),
  'interest-calculator':       lazy(() => import('../tools/calculative/InterestCalculator')),
  'fuel-calculator':           lazy(() => import('../tools/calculative/FuelCalculator')),
  'electricity-calculator':    lazy(() => import('../tools/calculative/ElectricityCalculator')),
  'mutual-fund':               lazy(() => import('../tools/calculative/MutualFund')),
  'emi':                       lazy(() => import('../tools/calculative/EMICalculator')),
  'line-chart':                lazy(() => import('../tools/calculative/LineChart')),
  'pie-chart':                 lazy(() => import('../tools/calculative/PieChart')),
  'level-measure':             lazy(() => import('../tools/calculative/LevelMeasure')),
  'thermometer':               lazy(() => import('../tools/calculative/Thermometer')),
  'pedometer':                 lazy(() => import('../tools/calculative/Pedometer')),
  'flashlight':                lazy(() => import('../tools/tools/Flashlight')),
  'color-picker':              lazy(() => import('../tools/tools/ColorPicker')),
  'audio-recorder':            lazy(() => import('../tools/tools/AudioRecorder')),
  'qr-scanner':                lazy(() => import('../tools/tools/QRScanner')),
  'weather':                   lazy(() => import('../tools/tools/Weather')),
  'translator':                lazy(() => import('../tools/tools/Translator')),
  'todo-list':                 lazy(() => import('../tools/tools/TodoList')),
  'compass':                   lazy(() => import('../tools/tools/Compass')),
  'qr-generator':              lazy(() => import('../tools/tools/QRGenerator')),
  'unit-converter':            lazy(() => import('../tools/tools/UnitConverter')),
  'cash-separator':            lazy(() => import('../tools/tools/CashSeparator')),
  'whatsapp-direct':           lazy(() => import('../tools/tools/WhatsAppDirect')),
  'noise-detector':            lazy(() => import('../tools/tools/NoiseDetector')),
  'metal-detector':            lazy(() => import('../tools/tools/MetalDetector')),
  'currency-converter':        lazy(() => import('../tools/tools/CurrencyConverter')),
  'breath-control':            lazy(() => import('../tools/health/BreathControl')),
  'periods-tracker':           lazy(() => import('../tools/health/PeriodsTracker')),
  'brain-reaction':            lazy(() => import('../tools/health/BrainReaction')),
  'water-tracker':             lazy(() => import('../tools/health/WaterTracker')),
  'vision-studio':             lazy(() => import('../tools/health/VisionStudio')),
  'sleep-assistant':           lazy(() => import('../tools/health/SleepAssistant')),
  'nutrition-expert':          lazy(() => import('../tools/health/NutritionExpert')),
  'text-scanner':              lazy(() => import('../tools/text/TextScanner')),
  'pdf-word-converter':        lazy(() => import('../tools/text/DocWordConverter')),
  'text-encrypt':              lazy(() => import('../tools/text/TextEncrypt')),
  'random-password':           lazy(() => import('../tools/text/RandomPasswordAndDice')),
  'type-tester':               lazy(() => import('../tools/text/TypeTester')),
  'text-to-binary':            lazy(() => import('../tools/text/TextToBinary')),
  'text-repeater':             lazy(() => import('../tools/text/TextRepeater')),
  'video-to-audio':            lazy(() => import('../tools/media/VideoToAudio')),
  'pdf-creator':               lazy(() => import('../tools/media/PDFCreator')),
  'image-compressor':          lazy(() => import('../tools/media/ImageCompressor')),
  'counter':                   lazy(() => import('../tools/media/Counter')),
  'battery':                   lazy(() => import('../tools/device/Battery')),
  'device-info':               lazy(() => import('../tools/device/Device-Info')),
  'sensor-info':               lazy(() => import('../tools/device/SensorInfo')),
  'storage':                   lazy(() => import('../tools/device/Storage')),
  'speaker-cleaner':           lazy(() => import('../tools/device/SpeakerCleaner')),
  'cpu-info':                  lazy(() => import('../tools/device/CPUInfo')),
  'network-speed':             lazy(() => import('../tools/device/NetworkSpeed')),
  'ram-info':                  lazy(() => import('../tools/device/RAMInfo')),
  'battery-test':              lazy(() => import('../tools/device/BatteryTest')),
  'snake-game':                lazy(() => import('../tools/games/SnakeGame')),
  'tic-tac-toe':               lazy(() => import('../tools/games/TicTacToe')),
  'memory-card':               lazy(() => import('../tools/games/MemoryCardGame')),
  'game-2048':                 lazy(() => import('../tools/games/Game2048')),
  'chess':                     lazy(() => import('../tools/games/Chess')),
};

// Extract slug from route like "/tools/bmi-calculator" → "bmi-calculator"
function routeToSlug(route: string) {
  return route.replace('/tools/', '');
}

type ToolPanel = {
  toolId: string;
  toolName: string;
  route: string;
  prefillData: Record<string, unknown>;
  category: string;
};

function ToolLoadingPanel() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: '16px', padding: '40px 20px',
    }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%',
        border: '3px solid rgba(233,30,140,0.15)',
        borderTopColor: '#e91e8c',
        animation: 'mt-spin 0.8s linear infinite',
      }} />
      <span style={{ color: '#666', fontSize: '13px', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '1px' }}>
        Loading tool…
      </span>
      <style>{`@keyframes mt-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  timeanddate: '#00d4ff',
  calculative: '#c9a96e',
  tools:       '#10B981',
  health:      '#EC4899',
  text:        '#F59E0B',
  media:       '#EF4444',
  device:      '#6366F1',
  games:       '#F97316',
};

function SingleToolPanel({
  panel,
  index,
  total,
}: {
  panel: ToolPanel;
  index: number;
  total: number;
}) {
  const navigate = useNavigate();
  const slug = routeToSlug(panel.route);
  const ToolComponent = toolComponentMap[slug];
  const accentColor = CATEGORY_COLORS[panel.category] || '#e91e8c';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.5 }}
      style={{
        flex: 1,
        minWidth: 0,
        background: 'rgba(12,16,28,0.85)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${accentColor}30`,
        borderRadius: '20px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      {/* Panel header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: `1px solid ${accentColor}25`,
        background: `linear-gradient(135deg, ${accentColor}12, transparent)`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '10px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: accentColor,
            boxShadow: `0 0 8px ${accentColor}`,
          }} />
          <span style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '12px', fontWeight: '800',
            color: accentColor, letterSpacing: '0.5px',
          }}>
            {panel.toolName.toUpperCase()}
          </span>
          <span style={{
            fontSize: '10px', color: '#555',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '4px', padding: '1px 6px',
          }}>
            TOOL {index + 1}/{total}
          </span>
        </div>
        <button
          onClick={() => navigate(panel.route, { state: { params: panel.prefillData, aiPayload: panel.prefillData } })}
          style={{
            background: `${accentColor}15`,
            border: `1px solid ${accentColor}40`,
            color: accentColor,
            borderRadius: '14px', padding: '4px 14px',
            fontSize: '11px', fontWeight: '700',
            cursor: 'pointer', transition: 'all 0.2s',
            fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.3px',
          }}
          onMouseEnter={e => {
            (e.target as HTMLButtonElement).style.background = `${accentColor}30`;
          }}
          onMouseLeave={e => {
            (e.target as HTMLButtonElement).style.background = `${accentColor}15`;
          }}
        >
          Full Screen ↗
        </button>
      </div>

      {/* Tool content */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {ToolComponent ? (
          <Suspense fallback={<ToolLoadingPanel />}>
            <ToolComponent {...(panel.prefillData as Record<string, unknown>)} />
          </Suspense>
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: '12px', padding: '40px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '40px' }}>🔧</div>
            <p style={{ color: '#888', fontSize: '14px' }}>
              Opening <strong style={{ color: accentColor }}>{panel.toolName}</strong>…
            </p>
            <button
              onClick={() => navigate(panel.route, { state: { params: panel.prefillData, aiPayload: panel.prefillData } })}
              style={{
                background: accentColor,
                border: 'none', borderRadius: '20px',
                color: '#fff', padding: '10px 24px',
                fontSize: '13px', fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Open Tool →
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main MultiToolView component ─────────────────────────────────
export default function MultiToolView() {
  const location = useLocation();
  const navigate = useNavigate();
  const themeContext = useContext(ThemeContext);

  const state = location.state as {
    panels?: ToolPanel[];
    query?: string;
    workflowDescription?: string;
  } | null;

  const panels: ToolPanel[] = state?.panels || [];
  const userQuery = state?.query || '';
  const workflowDesc = state?.workflowDescription || '';

  if (panels.length === 0) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: themeContext?.tokens?.background || '#080f18',
      color: themeContext?.tokens?.textPrimary || '#e2e2f0',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header bar */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(8,15,24,0.9)',
        backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', gap: '16px',
        flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <BackButton />

        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', flex: 1,
        }}>
          <div style={{
            display: 'flex', gap: '4px',
          }}>
            {panels.map((_, i) => (
              <div key={i} style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: ['#e91e8c', '#00d4ff', '#c9a96e'][i % 3],
                boxShadow: `0 0 8px ${['#e91e8c', '#00d4ff', '#c9a96e'][i % 3]}`,
                animation: `mt-pulse ${1.5 + i * 0.3}s ease-in-out infinite alternate`,
              }} />
            ))}
          </div>
          <div>
            <span style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '11px', fontWeight: '800',
              color: '#e91e8c', letterSpacing: '1px',
            }}>
              MULTI-TOOL WORKSPACE
            </span>
            {userQuery && (
              <div style={{ fontSize: '12px', color: '#666', marginTop: '1px' }}>
                "{userQuery}"
              </div>
            )}
          </div>
        </div>

        {workflowDesc && (
          <div style={{
            fontSize: '11px', color: '#888',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px', padding: '4px 12px',
            maxWidth: '280px', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            🔀 {workflowDesc}
          </div>
        )}

        <div style={{
          background: 'rgba(233,30,140,0.12)',
          border: '1px solid rgba(233,30,140,0.25)',
          borderRadius: '16px', padding: '4px 12px',
          fontSize: '11px', fontWeight: '700', color: '#e91e8c',
          letterSpacing: '0.3px',
        }}>
          {panels.length} TOOLS ACTIVE
        </div>
      </div>

      {/* Tool panels grid */}
      <div style={{
        flex: 1, padding: '20px 24px 24px',
        display: 'flex',
        gap: '16px',
        flexDirection: window.innerWidth < 900 ? 'column' : 'row',
        minHeight: 0,
        height: 'calc(100vh - 70px)',
      }}>
        {panels.map((panel, i) => (
          <SingleToolPanel key={panel.toolId} panel={panel} index={i} total={panels.length} />
        ))}
      </div>

      <style>{`
        @keyframes mt-pulse { from { opacity: 0.6; } to { opacity: 1; } }
        @keyframes mt-spin  { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
