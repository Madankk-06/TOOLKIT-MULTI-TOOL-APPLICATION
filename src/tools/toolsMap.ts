import { lazy, ComponentType } from 'react'

export const toolsMap: Record<string, ComponentType> = {
  // ✅ Time & Date (6 tools) - COMPLETE
  'analog-clock': lazy(() => import('./timeanddate/AnalogClock')),
  'digital-clock': lazy(() => import('./timeanddate/DigitalClock')),
  'stopwatch': lazy(() => import('./timeanddate/Stopwatch')),
  'timer': lazy(() => import('./timeanddate/Timer')),
  'leap-year': lazy(() => import('./timeanddate/LeapYear')),
  'world-time': lazy(() => import('./timeanddate/TimeZone')),
  
  // ✅ Calculative (15 tools) - UP TO #21 PEDOMETER
  'calculator': lazy(() => import('./calculative/Calculator')),
  'bmi-calculator': lazy(() => import('./calculative/BMICalculator')),
  'age-calculator': lazy(() => import('./calculative/AgeCalculator')),
  'discount-calculator': lazy(() => import('./calculative/DiscountCalculator')),
  'percentage-calculator': lazy(() => import('./calculative/PercentageCalculator')),
  'interest-calculator': lazy(() => import('./calculative/InterestCalculator')),
  'fuel-calculator': lazy(() => import('./calculative/FuelCalculator')),
  'electricity-calculator': lazy(() => import('./calculative/ElectricityCalculator')),
  'mutual-fund': lazy(() => import('./calculative/MutualFund')),
  'emi': lazy(() => import('./calculative/EMICalculator')),
  'line-chart': lazy(() => import('./calculative/LineChart')),
  'pie-chart': lazy(() => import('./calculative/PieChart')),
  'level-measure': lazy(() => import('./calculative/LevelMeasure')),
  'thermometer': lazy(() => import('./calculative/Thermometer')),
  'pedometer': lazy(() => import('./calculative/Pedometer')),
  
  // ✅ Tools Category (#22-34) - UNCOMMENTED AS IN YOUR CODE
  'flashlight': lazy(() => import('./tools/Flashlight')),
  'color-picker': lazy(() => import('./tools/ColorPicker')),
  'qr-scanner': lazy(() => import('./tools/QRScanner')),
  'qr-generator': lazy(() => import('./tools/QRGenerator')),
  'unit-converter': lazy(() => import('./tools/UnitConverter')),
  'text-to-binary': lazy(() => import('./text/TextToBinary')),
  'to-do': lazy(() => import('./tools/TodoList')),
  'compass': lazy(() => import('./tools/Compass')),
  'weather': lazy(() => import('./tools/Weather')),
  'text-scanner': lazy(() => import('./text/TextScanner')),
  'pdf-word-converter': lazy(() => import('./text/DocWordConverter')),
  
  // 🚧 Tools Category - ADD THESE NEXT (commented out)
  'audio-recorder': lazy(() => import('./tools/AudioRecorder')),
  'translator': lazy(() => import('./tools/Translator')),
  'currency-converter': lazy(() => import('./tools/CurrencyConverter')),
  'cash-separator': lazy(() => import('./tools/CashSeparator')),
  'whatsapp-direct': lazy(() => import('./tools/WhatsAppDirect')),
  'noise-detector': lazy(() => import('./tools/NoiseDetector')),
  'metal-detector': lazy(() => import('./tools/MetalDetector')),
  
  // 🚧 Health Category (#35-37) - COMMENTED
  // 'breath-control': lazy(() => import('./BreathControl')),
  // 'period-tracker': lazy(() => import('./PeriodTracker')),
  // 'brain-reaction': lazy(() => import('./BrainReaction')),
  
  // 🚧 Text Category (#38-43) - COMMENTED (except TextScanner which you have)
  // 'text-encrypt': lazy(() => import('./TextEncrypt')),
  // 'text-repeater': lazy(() => import('./TextRepeater')),
  // 'password-dice': lazy(() => import('./PasswordDice')),
  // 'type-tester': lazy(() => import('./TypeTester')),
  
  // 🚧 Media Category (#44-47) - COMMENTED
  // 'video-to-audio': lazy(() => import('./VideoToAudio')),
  // 'pdf-creator': lazy(() => import('./PDFCreator')),
  // 'image-compress': lazy(() => import('./ImageCompress')),
  // counter: lazy(() => import('./Counter')),
  
  // 🚧 Device Category (#48-56) - COMMENTED
  // battery: lazy(() => import('./Battery')),
  // 'device-info': lazy(() => import('./DeviceInfo')),
  // 'sensor-info': lazy(() => import('./SensorInfo')),
  // storage: lazy(() => import('./Storage')),
  // 'speaker-cleaner': lazy(() => import('./SpeakerCleaner')),
  // 'cpu-info': lazy(() => import('./CPUInfo')),
  // 'network-speed': lazy(() => import('./NetworkSpeed')),
  // 'ram-info': lazy(() => import('./RAMInfo')),
  // 'battery-test': lazy(() => import('./BatteryTest')),
  
  // 🚧 Games Category (#57-60) - COMMENTED
  // 'game-2048': lazy(() => import('./Game2048')),
  // 'memory-cards': lazy(() => import('./MemoryCards')),
  // 'simon-says': lazy(() => import('./SimonSays')),
  // 'tic-tac-toe': lazy(() => import('./TicTacToe'))
}