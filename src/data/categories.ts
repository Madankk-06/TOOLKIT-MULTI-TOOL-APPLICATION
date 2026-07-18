export interface Tool {
  id: string;
  name: string;
  path: string;
  icon: string;
  description: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  tools: Tool[];
}

export const categories: Category[] = [
  {
    id: 'timeanddate', name: 'Time & Date', icon: 'ClockIcon', color: '#00d4ff',
    tools: [
      { id: 'analog-clock',  name: 'Analog Clock',  path: '/tools/analog-clock',  icon: 'AnalogClockIcon',  description: 'Classic metallic analog clock' },
      { id: 'digital-clock', name: 'Digital Clock', path: '/tools/digital-clock', icon: 'DigitalClockIcon', description: 'Precision digital time display' },
      { id: 'stopwatch',     name: 'Stopwatch',     path: '/tools/stopwatch',     icon: 'StopwatchIcon',    description: 'Lap timer and stopwatch' },
      { id: 'timer',         name: 'Timer',         path: '/tools/timer',         icon: 'TimerIcon',        description: 'Countdown timer with alarm' },
      { id: 'leap-year',     name: 'Leap Year',     path: '/tools/leap-year',     icon: 'LeapYearIcon',     description: 'Check any year for leap year' },
      { id: 'time-zone',     name: 'Time Zone',     path: '/tools/time-zone',     icon: 'TimeZoneIcon',     description: 'World time zone converter' },
    ]
  },
  {
    id: 'calculative', name: 'Calculative', icon: 'AbacusIcon', color: '#c9a96e',
    tools: [
      { id: 'calculator',             name: 'Calculator',             path: '/tools/calculator',             icon: 'CalcIcon',       description: 'Scientific calculator' },
      { id: 'bmi-calculator',         name: 'BMI Calculator',         path: '/tools/bmi-calculator',         icon: 'BMIIcon',        description: 'Body Mass Index calculator' },
      { id: 'age-calculator',         name: 'Age Calculator',         path: '/tools/age-calculator',         icon: 'AgeIcon',        description: 'Exact age from birthdate' },
      { id: 'discount-calculator',    name: 'Discount Calculator',    path: '/tools/discount-calculator',    icon: 'DiscountIcon',   description: 'Sale price and savings' },
      { id: 'percentage-calculator',  name: 'Percentage Calculator',  path: '/tools/percentage-calculator',  icon: 'PercentIcon',    description: 'Quick percentage math' },
      { id: 'interest-calculator',    name: 'Interest Calculator',    path: '/tools/interest-calculator',    icon: 'InterestIcon',   description: 'Simple and compound interest' },
      { id: 'fuel-calculator',        name: 'Fuel Calculator',        path: '/tools/fuel-calculator',        icon: 'FuelIcon',       description: 'Fuel cost and mileage' },
      { id: 'electricity-calculator', name: 'Electricity Calculator', path: '/tools/electricity-calculator', icon: 'ElectricIcon',   description: 'Power consumption and cost' },
      { id: 'mutual-fund',            name: 'Mutual Fund',            path: '/tools/mutual-fund',            icon: 'FundIcon',       description: 'SIP and lump sum returns' },
      { id: 'emi',                    name: 'EMI Calculator',         path: '/tools/emi',                    icon: 'EMIIcon',        description: 'Loan EMI calculator' },
      { id: 'line-chart',             name: 'Line Chart',             path: '/tools/line-chart',             icon: 'LineChartIcon',  description: 'Interactive line chart maker' },
      { id: 'pie-chart',              name: 'Pie Chart',              path: '/tools/pie-chart',              icon: 'PieChartIcon',   description: 'Interactive pie chart maker' },
      { id: 'level-measure',          name: 'Level Measure',          path: '/tools/level-measure',          icon: 'LevelIcon',      description: 'Device bubble level tool' },
      { id: 'thermometer',            name: 'Thermometer',            path: '/tools/thermometer',            icon: 'ThermIcon',      description: 'Temperature unit converter' },
      { id: 'pedometer',              name: 'Pedometer',              path: '/tools/pedometer',              icon: 'PedometerIcon',  description: 'Step counter tracker' },
    ]
  },
  {
    id: 'tools', name: 'Tools', icon: 'WrenchIcon', color: '#c9a96e',
    tools: [
      { id: 'color-picker',      name: 'Color Picker',       path: '/tools/color-picker',      icon: 'ColorIcon',      description: 'Shatter images into color. Extract palettes.' },
      { id: 'flashlight',        name: 'Flashlight',         path: '/tools/flashlight',        icon: 'FlashlightIcon', description: 'Full-screen flashlight' },
      { id: 'audio-recorder',    name: 'Audio Recorder',     path: '/tools/audio-recorder',    icon: 'MicIcon',        description: 'Record and save audio clips' },
      { id: 'qr-scanner',        name: 'QR Scanner',         path: '/tools/qr-scanner',        icon: 'QRScanIcon',     description: 'Scan QR codes via camera' },
      { id: 'weather',           name: 'Weather',            path: '/tools/weather',           icon: 'WeatherIcon',    description: 'Live weather by location' },
      { id: 'translator',        name: 'Translator',         path: '/tools/translator',        icon: 'TranslateIcon',  description: 'Multi-language translator' },
      { id: 'lists-to-do',       name: 'Lists to Do',        path: '/tools/lists-to-do',       icon: 'TodoIcon',       description: 'Task and to-do manager' },
      { id: 'compass',           name: 'Compass',            path: '/tools/compass',           icon: 'CompassIcon',    description: 'Digital magnetic compass' },
      { id: 'qr-generator',      name: 'QR Generator',       path: '/tools/qr-generator',      icon: 'QRGenIcon',      description: 'Generate custom QR codes' },
      { id: 'unit-converter',    name: 'Unit Converter',     path: '/tools/unit-converter',    icon: 'UnitIcon',       description: 'Convert any measurement unit' },
      { id: 'cash-separator',    name: 'Cash Separator',     path: '/tools/cash-separator',    icon: 'CashIcon',       description: 'Split cash denominations' },
      { id: 'whatsapp-direct',   name: 'WhatsApp Direct',    path: '/tools/whatsapp-direct',   icon: 'WAIcon',         description: 'Message without saving contact' },
      { id: 'noise-detector',    name: 'Noise Detector',     path: '/tools/noise-detector',    icon: 'NoiseIcon',      description: 'Measure ambient noise (dB)' },
      { id: 'metal-detector',    name: 'Metal Detector',     path: '/tools/metal-detector',    icon: 'MetalIcon',      description: 'Magnetic field detector' },
      { id: 'currency-converter',name: 'Currency Converter', path: '/tools/currency-converter',icon: 'CurrencyIcon',   description: 'Live exchange rates' },
    ]
  },
  {
    id: 'health', name: 'Health', icon: 'HeartIcon', color: '#ff4d6d',
    tools: [
      { id: 'breath-control',  name: 'Breath Control',  path: '/tools/breath-control',  icon: 'BreathIcon', description: 'Guided breathing exercises' },
      { id: 'periods-tracker', name: 'Periods Tracker', path: '/tools/periods-tracker', icon: 'PeriodIcon', description: 'Menstrual cycle tracker' },
      { id: 'brain-reaction',  name: 'Brain Reaction',  path: '/tools/brain-reaction',  icon: 'BrainIcon',  description: 'Test your reaction time (ms)' },
      { id: 'water-tracker',   name: 'Hydration Pro',   path: '/tools/water-tracker',   icon: 'WaterIcon',  description: 'Daily water intake with 3D fluid animation' },
      { id: 'vision-studio',   name: 'Vision Studio',   path: '/tools/vision-studio',   icon: 'EyeIcon',    description: 'Snellen eye chart and color blindness test' },
      { id: 'sleep-assistant', name: 'DreamFlow',       path: '/tools/sleep-assistant', icon: 'SleepIcon',  description: 'Optimal sleep cycles and wake-up times' },
      { id: 'nutrition-expert',name: 'Nutrition Expert',path: '/tools/nutrition-expert',icon: 'FoodIcon',   description: 'Calculate BMR, TDEE, and daily macros' },
    ]
  },
  {
    id: 'text', name: 'Text', icon: 'TextIcon', color: '#00d4ff',
    tools: [
      { id: 'text-scanner',    name: 'Doc & Image to Text',    path: '/tools/text-scanner',    icon: 'ScanIcon',     description: 'Extract text from images, PDF & Word' },
      { id: 'pdf-word-converter', name: 'PDF ↔ Word Converter', path: '/tools/pdf-word-converter', icon: 'PDFIcon', description: 'Convert PDF to Word and Word to PDF' },
      { id: 'text-encrypt',    name: 'Text Encrypt',           path: '/tools/text-encrypt',    icon: 'EncryptIcon',  description: 'Encode and decode text ciphers' },
      { id: 'text-repeater',   name: 'Text Repeater',          path: '/tools/text-repeater',   icon: 'RepeatIcon',   description: 'Repeat text N times with separator' },
      { id: 'random-password', name: 'Random Password & Dice', path: '/tools/random-password', icon: 'PasswordIcon', description: 'Secure password generator and dice roller' },
      { id: 'type-tester',     name: 'Type Tester',            path: '/tools/type-tester',     icon: 'TypeIcon',     description: 'Typing speed and accuracy WPM test' },
      { id: 'text-to-binary',  name: 'Text to Binary',         path: '/tools/text-to-binary',  icon: 'BinaryIcon',   description: 'Convert text to binary, hex, ASCII' },
    ]
  },
  {
    id: 'media', name: 'Media', icon: 'MediaIcon', color: '#c9a96e',
    tools: [
      { id: 'video-to-audio',   name: 'Video to Audio',   path: '/tools/video-to-audio',   icon: 'VideoAudioIcon', description: 'Extract audio from video files' },
      { id: 'pdf-creator',      name: 'PDF Creator',      path: '/tools/pdf-creator',      icon: 'PDFIcon',        description: 'Create PDF from images or text' },
      { id: 'image-compressor', name: 'Image Compressor', path: '/tools/image-compressor', icon: 'CompressIcon',   description: 'Reduce image file size instantly' },
      { id: 'counter',          name: 'Counter',          path: '/tools/counter',          icon: 'CounterIcon',    description: 'Premium vibrating tally counter' },
    ]
  },
  {
    id: 'device', name: 'Device', icon: 'DeviceIcon', color: '#00d4ff',
    tools: [
      { id: 'battery',          name: 'Battery',          path: '/tools/battery',          icon: 'BatteryIcon',  description: 'Battery level, health, charging status' },
      { id: 'device-info',      name: 'Device Info',      path: '/tools/device-info',      icon: 'InfoIcon',     description: 'Full device and browser specifications' },
      { id: 'sensor-info',      name: 'Sensor Info',      path: '/tools/sensor-info',      icon: 'SensorIcon',   description: 'Available device sensors and live readings' },
      { id: 'storage',          name: 'Storage',          path: '/tools/storage',          icon: 'StorageIcon',  description: 'Storage usage breakdown chart' },
      { id: 'speaker-cleaner',  name: 'Speaker Cleaner',  path: '/tools/speaker-cleaner',  icon: 'SpeakerIcon',  description: 'Clean speakers with sound wave frequencies' },
      { id: 'cpu-info',         name: 'CPU Info',         path: '/tools/cpu-info',         icon: 'CPUIcon',      description: 'Processor cores and performance info' },
      { id: 'network-speed',    name: 'Network Speed',    path: '/tools/network-speed',    icon: 'NetworkIcon',  description: 'Internet download speed test' },
      { id: 'ram-info',         name: 'RAM Info',         path: '/tools/ram-info',         icon: 'RAMIcon',      description: 'Memory and JS heap usage info' },
      { id: 'battery-test',     name: 'Battery Test',     path: '/tools/battery-test',     icon: 'BattTestIcon', description: 'Battery drain rate stress test' },
    ]
  },
  {
    id: 'games', name: 'Games', icon: 'GamepadIcon', color: '#c9a96e',
    tools: [
      { id: 'snake-game',  name: 'Snake Game',       path: '/tools/snake-game',  icon: 'SnakeIcon',  description: 'Classic neon snake arcade game' },
      { id: 'tic-tac-toe', name: 'Tic Tac Toe',      path: '/tools/tic-tac-toe', icon: 'TicTacIcon', description: '2 player or vs unbeatable AI' },
      { id: 'memory-card', name: 'Memory Card Game', path: '/tools/memory-card', icon: 'MemoryIcon', description: 'Card matching memory challenge' },
      { id: 'game-2048',   name: '2048',             path: '/tools/game-2048',   icon: 'Icon2048',   description: 'Slide and merge tiles to 2048' },
      { id: 'chess',       name: 'Chess',            path: '/tools/chess',       icon: 'ChessIcon',  description: '2-player premium chess with full rules' },
    ]
  },
];