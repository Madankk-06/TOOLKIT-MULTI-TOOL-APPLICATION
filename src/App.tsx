import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import OnboardingGuide from './components/OnboardingGuide';
import ErrorBoundary from './components/ErrorBoundary';

// Auth Pages (eagerly loaded — needed immediately)
import Login from './pages/Login';
import Register from './pages/Register';

// Main Pages (eagerly loaded — needed immediately)
import Home from './pages/Home';
import CategoryPage from './pages/CategoryPage';
import ResetPassword from './pages/ResetPassword';

// AI Pages (lazy — heavy deps)
const InsightsDashboard = lazy(() => import('./pages/InsightsDashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const MultiToolView = lazy(() => import('./pages/MultiToolView'));
const AIGuide = lazy(() => import('./pages/AIGuide'));
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions'));

// ── Lazy-loaded Tool Components ─────────────────────────────────────
// Time & Date
const AnalogClock = lazy(() => import('./tools/timeanddate/AnalogClock'));
const DigitalClock = lazy(() => import('./tools/timeanddate/DigitalClock'));
const Stopwatch = lazy(() => import('./tools/timeanddate/Stopwatch'));
const Timer = lazy(() => import('./tools/timeanddate/Timer'));
const LeapYear = lazy(() => import('./tools/timeanddate/LeapYear'));
const TimeZone = lazy(() => import('./tools/timeanddate/TimeZone'));

// Calculative
const Calculator = lazy(() => import('./tools/calculative/Calculator'));
const BMICalculator = lazy(() => import('./tools/calculative/BMICalculator'));
const AgeCalculator = lazy(() => import('./tools/calculative/AgeCalculator'));
const DiscountCalculator = lazy(() => import('./tools/calculative/DiscountCalculator'));
const PercentageCalculator = lazy(() => import('./tools/calculative/PercentageCalculator'));
const InterestCalculator = lazy(() => import('./tools/calculative/InterestCalculator'));
const FuelCalculator = lazy(() => import('./tools/calculative/FuelCalculator'));
const ElectricityCalculator = lazy(() => import('./tools/calculative/ElectricityCalculator'));
const MutualFund = lazy(() => import('./tools/calculative/MutualFund'));
const EMICalculator = lazy(() => import('./tools/calculative/EMICalculator'));
const LineChart = lazy(() => import('./tools/calculative/LineChart'));
const PieChart = lazy(() => import('./tools/calculative/PieChart'));
const LevelMeasure = lazy(() => import('./tools/calculative/LevelMeasure'));
const Thermometer = lazy(() => import('./tools/calculative/Thermometer'));
const Pedometer = lazy(() => import('./tools/calculative/Pedometer'));

// Tools
const ColorPicker = lazy(() => import('./tools/tools/ColorPicker'));
const Flashlight = lazy(() => import('./tools/tools/Flashlight'));
const AudioRecorder = lazy(() => import('./tools/tools/AudioRecorder'));
const QRScanner = lazy(() => import('./tools/tools/QRScanner'));
const Weather = lazy(() => import('./tools/tools/Weather'));
const TodoList = lazy(() => import('./tools/tools/TodoList'));
const Compass = lazy(() => import('./tools/tools/Compass'));
const QRGenerator = lazy(() => import('./tools/tools/QRGenerator'));
const UnitConverter = lazy(() => import('./tools/tools/UnitConverter'));
const CashSeparator = lazy(() => import('./tools/tools/CashSeparator'));
const WhatsAppDirect = lazy(() => import('./tools/tools/WhatsAppDirect'));
const NoiseDetector = lazy(() => import('./tools/tools/NoiseDetector'));
const MetalDetector = lazy(() => import('./tools/tools/MetalDetector'));
const CurrencyConverter = lazy(() => import('./tools/tools/CurrencyConverter'));

const Translator = lazy(() => import('./tools/tools/Translator'));

// Health
const BreathControl = lazy(() => import('./tools/health/BreathControl'));
const PeriodsTracker = lazy(() => import('./tools/health/PeriodsTracker'));
const BrainReaction = lazy(() => import('./tools/health/BrainReaction'));
const WaterTracker = lazy(() => import('./tools/health/WaterTracker'));
const VisionStudio = lazy(() => import('./tools/health/VisionStudio'));
const SleepAssistant = lazy(() => import('./tools/health/SleepAssistant'));
const NutritionExpert = lazy(() => import('./tools/health/NutritionExpert'));

// Text
const TextScanner = lazy(() => import('./tools/text/TextScanner'));
const DocWordConverter = lazy(() => import('./tools/text/DocWordConverter'));
const TextEncrypt = lazy(() => import('./tools/text/TextEncrypt'));
const TextRepeater = lazy(() => import('./tools/text/TextRepeater'));
const RandomPasswordAndDice = lazy(() => import('./tools/text/RandomPasswordAndDice'));
const TypeTester = lazy(() => import('./tools/text/TypeTester'));
const TextToBinary = lazy(() => import('./tools/text/TextToBinary'));

// Media
const VideoToAudio = lazy(() => import('./tools/media/VideoToAudio'));
const PDFCreator = lazy(() => import('./tools/media/PDFCreator'));
const ImageCompressor = lazy(() => import('./tools/media/ImageCompressor'));
const Counter = lazy(() => import('./tools/media/Counter'));

// Device
const Battery = lazy(() => import('./tools/device/Battery'));
const DeviceInfo = lazy(() => import('./tools/device/Device-Info'));
const SensorInfo = lazy(() => import('./tools/device/SensorInfo'));
const Storage = lazy(() => import('./tools/device/Storage'));
const SpeakerCleaner = lazy(() => import('./tools/device/SpeakerCleaner'));
const CPUInfo = lazy(() => import('./tools/device/CPUInfo'));
const NetworkSpeed = lazy(() => import('./tools/device/NetworkSpeed'));
const RAMInfo = lazy(() => import('./tools/device/RAMInfo'));
const BatteryTest = lazy(() => import('./tools/device/BatteryTest'));

// Games
const SnakeGame = lazy(() => import('./tools/games/SnakeGame'));
const TicTacToe = lazy(() => import('./tools/games/TicTacToe'));
const MemoryCardGame = lazy(() => import('./tools/games/MemoryCardGame'));
const Game2048 = lazy(() => import('./tools/games/Game2048'));
const Chess = lazy(() => import('./tools/games/Chess'));

// ── Loading Spinner ─────────────────────────────────────────────────
function ToolLoadingSpinner() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', gap: '20px',
    }}>
      <div style={{
        width: '44px', height: '44px', borderRadius: '50%',
        border: '3px solid rgba(201,169,110,0.15)',
        borderTopColor: '#c9a96e',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{
        fontFamily: "'Rajdhani', sans-serif", fontSize: '14px',
        color: 'var(--text-muted)', letterSpacing: '1px',
      }}>
        Loading tool…
      </span>
    </div>
  );
}

// ── Layout wrapper ──────────────────────────────────────────────────
function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: '100vh' }}>
      {currentUser && <Navbar />}
      {currentUser && <OnboardingGuide />}
      <main style={{ 
        flex: 1, 
        marginLeft: (currentUser && !isMobile) ? '290px' : '0',
        paddingTop: (currentUser && isMobile) ? '60px' : '0', 
        width: '100%',
        minHeight: '100vh',
        boxSizing: 'border-box'
      }}>
        {children}
      </main>
    </div>
  );
}

// ── Tool page wrapper with Suspense ─────────────────────────────────
function ToolPage({ element }: { element: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ErrorBoundary>
          <Suspense fallback={<ToolLoadingSpinner />}>
            {element}
          </Suspense>
        </ErrorBoundary>
      </AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public Routes ── */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/terms" element={
          <Suspense fallback={<div style={{ background: '#080f18', minHeight: '100vh' }} />}>
            <TermsAndConditions />
          </Suspense>
        } />

        {/* ── Protected Home & Category ── */}
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout><Home /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/category/:categoryId" element={
          <ProtectedRoute>
            <AppLayout><CategoryPage /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/insights" element={
          <ProtectedRoute>
            <AppLayout>
              <ErrorBoundary>
                <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading insights…</div>}>
                  <InsightsDashboard />
                </Suspense>
              </ErrorBoundary>
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/multi-tool" element={
          <ProtectedRoute>
            <AppLayout>
              <ErrorBoundary>
                <Suspense fallback={<div style={{ background: '#080f18', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e91e8c', fontFamily: 'Orbitron, sans-serif', fontSize: '14px', letterSpacing: '2px' }}>LOADING WORKSPACE…</div>}>
                  <MultiToolView />
                </Suspense>
              </ErrorBoundary>
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/ai-guide" element={
          <ProtectedRoute>
            <AppLayout>
              <ErrorBoundary>
                <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading guide…</div>}>
                  <AIGuide />
                </Suspense>
              </ErrorBoundary>
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <AppLayout>
              <ErrorBoundary>
                <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading settings…</div>}>
                  <Settings />
                </Suspense>
              </ErrorBoundary>
            </AppLayout>
          </ProtectedRoute>
        } />
        {/* ── Time & Date ── */}
        <Route path="/tools/analog-clock" element={<ToolPage element={<AnalogClock />} />} />
        <Route path="/tools/digital-clock" element={<ToolPage element={<DigitalClock />} />} />
        <Route path="/tools/stopwatch" element={<ToolPage element={<Stopwatch />} />} />
        <Route path="/tools/timer" element={<ToolPage element={<Timer />} />} />
        <Route path="/tools/leap-year" element={<ToolPage element={<LeapYear />} />} />
        <Route path="/tools/time-zone" element={<ToolPage element={<TimeZone />} />} />

        {/* ── Calculative ── */}
        <Route path="/tools/calculator" element={<ToolPage element={<Calculator />} />} />
        <Route path="/tools/bmi-calculator" element={<ToolPage element={<BMICalculator />} />} />
        <Route path="/tools/age-calculator" element={<ToolPage element={<AgeCalculator />} />} />
        <Route path="/tools/discount-calculator" element={<ToolPage element={<DiscountCalculator />} />} />
        <Route path="/tools/percentage-calculator" element={<ToolPage element={<PercentageCalculator />} />} />
        <Route path="/tools/interest-calculator" element={<ToolPage element={<InterestCalculator />} />} />
        <Route path="/tools/fuel-calculator" element={<ToolPage element={<FuelCalculator />} />} />
        <Route path="/tools/electricity-calculator" element={<ToolPage element={<ElectricityCalculator />} />} />
        <Route path="/tools/mutual-fund" element={<ToolPage element={<MutualFund />} />} />
        <Route path="/tools/emi" element={<ToolPage element={<EMICalculator />} />} />
        <Route path="/tools/line-chart" element={<ToolPage element={<LineChart />} />} />
        <Route path="/tools/pie-chart" element={<ToolPage element={<PieChart />} />} />
        <Route path="/tools/level-measure" element={<ToolPage element={<LevelMeasure />} />} />
        <Route path="/tools/thermometer" element={<ToolPage element={<Thermometer />} />} />
        <Route path="/tools/pedometer" element={<ToolPage element={<Pedometer />} />} />

        {/* ── Tools ── */}
        <Route path="/tools/color-picker" element={<ToolPage element={<ColorPicker />} />} />
        <Route path="/tools/flashlight" element={<ToolPage element={<Flashlight />} />} />
        <Route path="/tools/audio-recorder" element={<ToolPage element={<AudioRecorder />} />} />
        <Route path="/tools/qr-scanner" element={<ToolPage element={<QRScanner />} />} />
        <Route path="/tools/weather" element={<ToolPage element={<Weather />} />} />
        <Route path="/tools/translator" element={<ToolPage element={<Translator />} />} />
        <Route path="/tools/todo-list" element={<ToolPage element={<TodoList />} />} />
        <Route path="/tools/compass" element={<ToolPage element={<Compass />} />} />
        <Route path="/tools/qr-generator" element={<ToolPage element={<QRGenerator />} />} />
        <Route path="/tools/unit-converter" element={<ToolPage element={<UnitConverter />} />} />
        <Route path="/tools/cash-separator" element={<ToolPage element={<CashSeparator />} />} />
        <Route path="/tools/whatsapp-direct" element={<ToolPage element={<WhatsAppDirect />} />} />
        <Route path="/tools/noise-detector" element={<ToolPage element={<NoiseDetector />} />} />
        <Route path="/tools/metal-detector" element={<ToolPage element={<MetalDetector />} />} />
        <Route path="/tools/currency-converter" element={<ToolPage element={<CurrencyConverter />} />} />

        {/* ── Health ── */}
        <Route path="/tools/breath-control" element={<ToolPage element={<BreathControl />} />} />
        <Route path="/tools/periods-tracker" element={<ToolPage element={<PeriodsTracker />} />} />
        <Route path="/tools/brain-reaction" element={<ToolPage element={<BrainReaction />} />} />
        <Route path="/tools/water-tracker" element={<ToolPage element={<WaterTracker />} />} />
        <Route path="/tools/vision-studio" element={<ToolPage element={<VisionStudio />} />} />
        <Route path="/tools/sleep-assistant" element={<ToolPage element={<SleepAssistant />} />} />
        <Route path="/tools/nutrition-expert" element={<ToolPage element={<NutritionExpert />} />} />

        {/* ── Text ── */}
        <Route path="/tools/text-scanner" element={<ToolPage element={<TextScanner />} />} />
        <Route path="/tools/pdf-word-converter" element={<ToolPage element={<DocWordConverter />} />} />
        <Route path="/tools/text-encrypt" element={<ToolPage element={<TextEncrypt />} />} />
        <Route path="/tools/text-repeater" element={<ToolPage element={<TextRepeater />} />} />
        <Route path="/tools/random-password" element={<ToolPage element={<RandomPasswordAndDice />} />} />
        <Route path="/tools/type-tester" element={<ToolPage element={<TypeTester />} />} />
        <Route path="/tools/text-to-binary" element={<ToolPage element={<TextToBinary />} />} />

        {/* ── Media ── */}
        <Route path="/tools/video-to-audio" element={<ToolPage element={<VideoToAudio />} />} />
        <Route path="/tools/pdf-creator" element={<ToolPage element={<PDFCreator />} />} />
        <Route path="/tools/image-compressor" element={<ToolPage element={<ImageCompressor />} />} />
        <Route path="/tools/counter" element={<ToolPage element={<Counter />} />} />

        {/* ── Device ── */}
        <Route path="/tools/battery" element={<ToolPage element={<Battery />} />} />
        <Route path="/tools/device-info" element={<ToolPage element={<DeviceInfo />} />} />
        <Route path="/tools/sensor-info" element={<ToolPage element={<SensorInfo />} />} />
        <Route path="/tools/storage" element={<ToolPage element={<Storage />} />} />
        <Route path="/tools/speaker-cleaner" element={<ToolPage element={<SpeakerCleaner />} />} />
        <Route path="/tools/cpu-info" element={<ToolPage element={<CPUInfo />} />} />
        <Route path="/tools/network-speed" element={<ToolPage element={<NetworkSpeed />} />} />
        <Route path="/tools/ram-info" element={<ToolPage element={<RAMInfo />} />} />
        <Route path="/tools/battery-test" element={<ToolPage element={<BatteryTest />} />} />

        {/* ── Games ── */}
        <Route path="/tools/snake-game" element={<ToolPage element={<SnakeGame />} />} />
        <Route path="/tools/tic-tac-toe" element={<ToolPage element={<TicTacToe />} />} />
        <Route path="/tools/memory-card" element={<ToolPage element={<MemoryCardGame />} />} />
        <Route path="/tools/game-2048" element={<ToolPage element={<Game2048 />} />} />
        <Route path="/tools/chess" element={<ToolPage element={<Chess />} />} />

        {/* ── Route Aliases & Redirect Mappings ── */}
        <Route path="/tools/lists-to-do" element={<ToolPage element={<TodoList />} />} />
        <Route path="/tools/time-zones" element={<Navigate to="/tools/time-zone" replace />} />
        <Route path="/tools/time_zone" element={<Navigate to="/tools/time-zone" replace />} />
        <Route path="/tools/mutual-funds" element={<Navigate to="/tools/mutual-fund" replace />} />
        <Route path="/tools/period-tracker" element={<Navigate to="/tools/periods-tracker" replace />} />
        <Route path="/tools/hydration-pro" element={<Navigate to="/tools/water-tracker" replace />} />
        <Route path="/tools/dream-flow" element={<Navigate to="/tools/sleep-assistant" replace />} />
        <Route path="/tools/password-generator" element={<Navigate to="/tools/random-password" replace />} />
        <Route path="/tools/dice" element={<Navigate to="/tools/random-password" replace />} />
        <Route path="/tools/snake" element={<Navigate to="/tools/snake-game" replace />} />
        <Route path="/tools/2048" element={<Navigate to="/tools/game-2048" replace />} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
