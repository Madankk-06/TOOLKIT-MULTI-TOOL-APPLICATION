// ============================================================
// FILE: src/lib/toolsRegistry.ts
// Complete registry of all 67 Toolkit tools.
// ============================================================

export type ToolCategory =
  | "timeanddate"
  | "calculative"
  | "tools"
  | "health"
  | "text"
  | "media"
  | "device"
  | "games";

export type TestCase = {
  input: Record<string, unknown>;
  expectedBehavior: string;
  shouldFail: boolean;
};

export type ToolConfig = {
  id: string;
  name: string;
  category: ToolCategory;
  keywords: string[];
  description: string;
  inputSchema: Record<string, "string" | "number" | "boolean" | "file" | "image">;
  route: string;
  supportsMultiTool: boolean;
  aiFeatures: string[];
  offlineCapable: boolean;
  categoryColor: string;
  testCases: TestCase[];
};

// ── Category color map ────────────────────────────────────────
export const CATEGORY_COLORS: Record<ToolCategory, string> = {
  timeanddate: "#3B82F6",
  calculative: "#8B5CF6",
  tools:       "#10B981",
  health:      "#EC4899",
  text:        "#F59E0B",
  media:       "#EF4444",
  device:      "#6366F1",
  games:       "#F97316",
};

export const toolsRegistry: ToolConfig[] = [

  // ══════════════════════════════════════════════════════════
  // TIME & DATE (6)
  // ══════════════════════════════════════════════════════════
  {
    id: "analogClock",
    name: "Analog Clock",
    category: "timeanddate",
    categoryColor: "#3B82F6",
    keywords: [
      "analog clock", "analogue clock", "anlog clock",
      "what time is it", "show me a clock", "I want to see the time",
      "how do I check the time", "help me read the clock",
      "classic clock", "dial clock", "wall clock", "round clock"
    ],
    description: "A traditional analog clock with animated hour, minute, and second hands.",
    inputSchema: {},
    route: "/tools/analog-clock",
    supportsMultiTool: true,
    aiFeatures: ["voice-time-query"],
    offlineCapable: true,
    testCases: [
      { input: {}, expectedBehavior: "Displays current system time on animated analog dial with all three hands moving correctly", shouldFail: false },
      { input: { timezone: "" }, expectedBehavior: "Empty timezone falls back to system local time without crashing", shouldFail: false },
      { input: { timezone: 99999 }, expectedBehavior: "Invalid numeric timezone is rejected and shows inline error, falls back to local time", shouldFail: true }
    ]
  },

  {
    id: "digitalClock",
    name: "Digital Clock",
    category: "timeanddate",
    categoryColor: "#3B82F6",
    keywords: [
      "digital clock", "digitl clock", "number clock",
      "what is the exact time", "show time digitally", "how do I see time in numbers",
      "I want a digital display of time", "help me check the current time",
      "LED clock", "24 hour clock", "12 hour clock", "time display"
    ],
    description: "A high-contrast digital display showing the current time and date in real time.",
    inputSchema: { format: "string" },
    route: "/tools/digital-clock",
    supportsMultiTool: true,
    aiFeatures: ["alarm-integration"],
    offlineCapable: true,
    testCases: [
      { input: { format: "24h" }, expectedBehavior: "Displays time in HH:MM:SS 24-hour format updating every second", shouldFail: false },
      { input: { format: "12h" }, expectedBehavior: "Displays time in HH:MM:SS AM/PM 12-hour format", shouldFail: false },
      { input: { format: "invalid_xyz" }, expectedBehavior: "Unknown format falls back to 12h and displays an inline warning", shouldFail: true }
    ]
  },

  {
    id: "stopwatch",
    name: "Stopwatch",
    category: "timeanddate",
    categoryColor: "#3B82F6",
    keywords: [
      "stopwatch", "stop watch", "stopwach",
      "how do I time an event", "I want to measure elapsed time", "help me time my run",
      "start timer", "lap timer", "race timer",
      "elapsed time counter", "countdown", "chronometer"
    ],
    description: "A precise stopwatch with start, stop, reset, and lap recording using requestAnimationFrame.",
    inputSchema: { action: "string" },
    route: "/tools/stopwatch",
    supportsMultiTool: true,
    aiFeatures: ["performance-analysis"],
    offlineCapable: true,
    testCases: [
      { input: { action: "start" }, expectedBehavior: "Stopwatch begins counting from 00:00:00.000 and updates smoothly", shouldFail: false },
      { input: { action: "lap" }, expectedBehavior: "Records current time as a lap entry and continues counting without resetting", shouldFail: false },
      { input: { action: "" }, expectedBehavior: "Empty action is ignored; stopwatch shows idle state with no crash", shouldFail: true }
    ]
  },

  {
    id: "timer",
    name: "Timer",
    category: "timeanddate",
    categoryColor: "#3B82F6",
    keywords: [
      "timer", "timmer", "countdown timer",
      "set a timer for 5 minutes", "how do I set a countdown", "I want to set a reminder",
      "help me set a 10 minute timer", "kitchen timer", "study timer",
      "pomodoro timer", "alarm timer", "countdown clock"
    ],
    description: "A configurable countdown timer with audio notification and Page Visibility API pause support.",
    inputSchema: { duration: "number" },
    route: "/tools/timer",
    supportsMultiTool: true,
    aiFeatures: ["smart-timer", "voice-commands"],
    offlineCapable: true,
    testCases: [
      { input: { duration: 300 }, expectedBehavior: "Starts a 5-minute countdown from 05:00 and beeps when it reaches 00:00", shouldFail: false },
      { input: { duration: 0 }, expectedBehavior: "Zero duration shows inline error: 'Please enter a duration greater than 0'", shouldFail: true },
      { input: { duration: -60 }, expectedBehavior: "Negative duration shows inline error and does not start the timer", shouldFail: true }
    ]
  },

  {
    id: "leapYear",
    name: "Leap Year",
    category: "timeanddate",
    categoryColor: "#3B82F6",
    keywords: [
      "leap year", "leap year checker", "leapyear",
      "how do I check if a year is a leap year", "I want to know if this year has 366 days",
      "help me find leap years", "is 2024 a leap year", "February 29",
      "divisible by 4", "calendar year", "bissextile year"
    ],
    description: "Instantly checks whether any given year is a leap year with an explanation.",
    inputSchema: { year: "number" },
    route: "/tools/leap-year",
    supportsMultiTool: false,
    aiFeatures: ["ai-explanation"],
    offlineCapable: true,
    testCases: [
      { input: { year: 2024 }, expectedBehavior: "Returns 'Leap year ✓' because 2024 is divisible by 4 and not a century exception", shouldFail: false },
      { input: { year: 1900 }, expectedBehavior: "Returns 'Not a leap year' because 1900 is divisible by 100 but not 400", shouldFail: false },
      { input: { year: 0 }, expectedBehavior: "Zero is invalid; shows inline error 'Please enter a valid year'", shouldFail: true }
    ]
  },

  {
    id: "timeZone",
    name: "Time Zones",
    category: "timeanddate",
    categoryColor: "#3B82F6",
    keywords: [
      "time zones", "world time", "timezone", "time zone converter",
      "what time is it in New York", "how do I check time in another country",
      "I want to see multiple time zones", "help me convert time zones",
      "international time", "UTC offset", "GMT", "global clocks"
    ],
    description: "Displays current time across 97 world time zones with live updates.",
    inputSchema: { timezone: "string" },
    route: "/tools/time-zone",
    supportsMultiTool: true,
    aiFeatures: ["smart-timezone-lookup"],
    offlineCapable: true,
    testCases: [
      { input: { timezone: "America/New_York" }, expectedBehavior: "Shows current EST/EDT time for New York at the top of the list", shouldFail: false },
      { input: { timezone: "" }, expectedBehavior: "Empty filter shows all 97 time zones sorted by offset", shouldFail: false },
      { input: { timezone: "Invalid/Zone" }, expectedBehavior: "Invalid timezone shows inline error and falls back to showing all zones", shouldFail: true }
    ]
  },

  // ══════════════════════════════════════════════════════════
  // CALCULATIVE (15)
  // ══════════════════════════════════════════════════════════
  {
    id: "calculator",
    name: "Calculator",
    category: "calculative",
    categoryColor: "#8B5CF6",
    keywords: [
      "calculator", "calculater", "calulator",
      "how do I calculate", "I want to do math", "help me solve an equation",
      "what is 2 plus 2", "arithmetic", "math calculator",
      "solve expression", "compute", "basic math"
    ],
    description: "A full-featured scientific calculator supporting arithmetic, parentheses, and percentage operations.",
    inputSchema: { expression: "string" },
    route: "/tools/calculator",
    supportsMultiTool: true,
    aiFeatures: ["expression-parsing", "ai-explanation"],
    offlineCapable: true,
    testCases: [
      { input: { expression: "12 * (3 + 4) - 5" }, expectedBehavior: "Returns 79, correctly applying operator precedence and parentheses", shouldFail: false },
      { input: { expression: "" }, expectedBehavior: "Empty expression shows inline prompt 'Enter a calculation' without crashing", shouldFail: false },
      { input: { expression: "10 / 0" }, expectedBehavior: "Division by zero shows 'Undefined' instead of Infinity or NaN", shouldFail: true }
    ]
  },

  {
    id: "bmiCalculator",
    name: "BMI Calculator",
    category: "calculative",
    categoryColor: "#8B5CF6",
    keywords: [
      "bmi calculator", "bmi calc", "body mass index",
      "am I overweight", "how do I check my weight", "I want to know if I am healthy",
      "help me calculate my bmi", "obesity test", "underweight check",
      "healthy weight range", "weight to height ratio", "body fat check"
    ],
    description: "Calculates Body Mass Index from weight and height with WHO category classification.",
    inputSchema: { weight: "number", height: "number", unit: "string" },
    route: "/tools/bmi-calculator",
    supportsMultiTool: true,
    aiFeatures: ["health-recommendations", "ai-body-analysis"],
    offlineCapable: true,
    testCases: [
      { input: { weight: 70, height: 175, unit: "metric" }, expectedBehavior: "Returns BMI 22.9 classified as 'Normal weight' with green indicator", shouldFail: false },
      { input: { weight: 0, height: 175, unit: "metric" }, expectedBehavior: "Zero weight shows inline error 'Weight must be greater than 0'", shouldFail: true },
      { input: { weight: 70, height: 0, unit: "metric" }, expectedBehavior: "Zero height shows inline error 'Height must be greater than 0'", shouldFail: true }
    ]
  },

  {
    id: "ageCalculator",
    name: "Age Calculator",
    category: "calculative",
    categoryColor: "#8B5CF6",
    keywords: [
      "age calculator", "how old am I", "calculate my age",
      "I want to know my exact age", "help me find my age in days",
      "how many days old am I", "birthday calculator", "age in months",
      "age from date of birth", "DOB calculator", "years months days"
    ],
    description: "Calculates exact age in years, months, days, hours, and minutes from a date of birth.",
    inputSchema: { dob: "string" },
    route: "/tools/age-calculator",
    supportsMultiTool: true,
    aiFeatures: ["milestone-suggestions"],
    offlineCapable: true,
    testCases: [
      { input: { dob: "2000-01-01" }, expectedBehavior: "Returns correct age breakdown in years, months, days relative to today's date", shouldFail: false },
      { input: { dob: "" }, expectedBehavior: "Empty date shows inline error 'Please enter a valid date of birth'", shouldFail: true },
      { input: { dob: "2099-12-31" }, expectedBehavior: "Future date shows error 'Date of birth cannot be in the future'", shouldFail: true }
    ]
  },

  {
    id: "discountCalculator",
    name: "Discount Calculator",
    category: "calculative",
    categoryColor: "#8B5CF6",
    keywords: [
      "discount calculator", "sale price calculator", "coupon calculator",
      "how do I calculate discount", "I want to find sale price", "help me calculate savings",
      "what is 30 percent off", "final price after discount",
      "markdown calculator", "deal calculator", "off price"
    ],
    description: "Calculates final price, savings amount, and effective discount from original price and percentage.",
    inputSchema: { originalPrice: "number", discountPercent: "number" },
    route: "/tools/discount-calculator",
    supportsMultiTool: true,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: { originalPrice: 1000, discountPercent: 30 }, expectedBehavior: "Returns final price ₹700, savings ₹300, and confirms 30% discount applied", shouldFail: false },
      { input: { originalPrice: 0, discountPercent: 20 }, expectedBehavior: "Zero original price shows inline error 'Price must be greater than 0'", shouldFail: true },
      { input: { originalPrice: 500, discountPercent: 110 }, expectedBehavior: "Discount over 100% shows inline error 'Discount cannot exceed 100%'", shouldFail: true }
    ]
  },

  {
    id: "percentageCalculator",
    name: "Percentage Calculator",
    category: "calculative",
    categoryColor: "#8B5CF6",
    keywords: [
      "percentage calculator", "percent calculator", "percent of a number",
      "how do I calculate percentage", "I want to find what percent",
      "help me calculate tip", "what is 15 percent of 200",
      "percentage increase", "percentage decrease", "ratio to percent"
    ],
    description: "Calculates percentage of a value, percentage change, and reverse percentage operations.",
    inputSchema: { value: "number", percentage: "number" },
    route: "/tools/percentage-calculator",
    supportsMultiTool: true,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: { value: 200, percentage: 15 }, expectedBehavior: "Returns 30 as 15% of 200 and displays the formatted result clearly", shouldFail: false },
      { input: { value: 0, percentage: 50 }, expectedBehavior: "Zero value returns 0 without crashing", shouldFail: false },
      { input: { value: 100, percentage: -10 }, expectedBehavior: "Negative percentage shows inline error 'Percentage cannot be negative'", shouldFail: true }
    ]
  },

  {
    id: "interestCalculator",
    name: "Interest Calculator",
    category: "calculative",
    categoryColor: "#8B5CF6",
    keywords: [
      "interest calculator", "simple interest", "compound interest",
      "how do I calculate interest on a loan", "I want to find interest earned",
      "help me calculate compound interest", "bank interest calculator",
      "savings interest", "investment return", "annual interest rate"
    ],
    description: "Computes simple and compound interest with principal, rate, time, and compounding frequency.",
    inputSchema: { principal: "number", rate: "number", time: "number", type: "string" },
    route: "/tools/interest-calculator",
    supportsMultiTool: true,
    aiFeatures: ["investment-insights"],
    offlineCapable: true,
    testCases: [
      { input: { principal: 10000, rate: 8, time: 3, type: "compound" }, expectedBehavior: "Returns compound amount of ₹12,597.12 and interest earned of ₹2,597.12", shouldFail: false },
      { input: { principal: 0, rate: 8, time: 3, type: "simple" }, expectedBehavior: "Zero principal shows inline error 'Principal must be greater than 0'", shouldFail: true },
      { input: { principal: 10000, rate: 0, time: 3, type: "simple" }, expectedBehavior: "Zero rate returns 0 interest and ₹10,000 total without crashing", shouldFail: false }
    ]
  },

  {
    id: "fuelCalculator",
    name: "Fuel Calculator",
    category: "calculative",
    categoryColor: "#8B5CF6",
    keywords: [
      "fuel calculator", "petrol cost calculator", "gas mileage calculator",
      "how do I calculate fuel cost", "I want to find petrol expense for a trip",
      "help me calculate mileage", "trip fuel cost", "fuel efficiency",
      "km per litre", "miles per gallon", "fuel consumption"
    ],
    description: "Calculates total fuel cost and consumption for a trip based on distance and efficiency.",
    inputSchema: { distance: "number", fuelEfficiency: "number", fuelPrice: "number" },
    route: "/tools/fuel-calculator",
    supportsMultiTool: true,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: { distance: 300, fuelEfficiency: 15, fuelPrice: 102 }, expectedBehavior: "Returns 20L fuel needed and ₹2,040 total cost for 300km trip", shouldFail: false },
      { input: { distance: 0, fuelEfficiency: 15, fuelPrice: 100 }, expectedBehavior: "Zero distance returns 0 cost and 0 liters without error", shouldFail: false },
      { input: { distance: 100, fuelEfficiency: 0, fuelPrice: 100 }, expectedBehavior: "Zero fuel efficiency shows inline error 'Efficiency must be greater than 0'", shouldFail: true }
    ]
  },

  {
    id: "electricityCalculator",
    name: "Electricity Calculator",
    category: "calculative",
    categoryColor: "#8B5CF6",
    keywords: [
      "electricity calculator", "electric bill calculator", "power consumption calculator",
      "how do I calculate electricity bill", "I want to find power usage of appliances",
      "help me reduce my electricity bill", "kWh calculator",
      "energy consumption", "units of electricity", "watt to rupee"
    ],
    description: "Calculates electricity consumption in kWh and estimated cost for any appliance.",
    inputSchema: { watts: "number", hours: "number", rate: "number" },
    route: "/tools/electricity-calculator",
    supportsMultiTool: true,
    aiFeatures: ["energy-saving-tips"],
    offlineCapable: true,
    testCases: [
      { input: { watts: 1000, hours: 5, rate: 6 }, expectedBehavior: "Returns 5 kWh consumed and ₹30 cost for a 1000W appliance running 5 hours at ₹6/unit", shouldFail: false },
      { input: { watts: 0, hours: 8, rate: 6 }, expectedBehavior: "Zero watts returns 0 kWh and 0 cost without crashing", shouldFail: false },
      { input: { watts: 500, hours: -2, rate: 6 }, expectedBehavior: "Negative hours shows inline error 'Hours must be greater than 0'", shouldFail: true }
    ]
  },

  {
    id: "mutualFund",
    name: "Mutual Funds",
    category: "calculative",
    categoryColor: "#8B5CF6",
    keywords: [
      "mutual fund calculator", "SIP calculator", "lump sum investment",
      "how do I calculate SIP returns", "I want to plan my mutual fund investment",
      "help me find mutual fund maturity", "investment growth calculator",
      "CAGR calculator", "SIP return", "systematic investment plan"
    ],
    description: "Projects mutual fund returns for SIP and lump sum investments with compounding.",
    inputSchema: { amount: "number", rate: "number", tenure: "number", type: "string" },
    route: "/tools/mutual-fund",
    supportsMultiTool: true,
    aiFeatures: ["investment-insights"],
    offlineCapable: true,
    testCases: [
      { input: { amount: 5000, rate: 12, tenure: 10, type: "SIP" }, expectedBehavior: "Returns projected corpus of ~₹11.6L for ₹5000/month SIP at 12% for 10 years", shouldFail: false },
      { input: { amount: 0, rate: 12, tenure: 10, type: "SIP" }, expectedBehavior: "Zero amount shows inline error 'Amount must be greater than 0'", shouldFail: true },
      { input: { amount: 100000, rate: 0, tenure: 5, type: "lumpsum" }, expectedBehavior: "Zero rate returns the original amount as maturity value without error", shouldFail: false }
    ]
  },

  {
    id: "emiCalculator",
    name: "EMI Calculator",
    category: "calculative",
    categoryColor: "#8B5CF6",
    keywords: [
      "EMI calculator", "loan EMI", "equated monthly installment",
      "how do I calculate loan EMI", "I want to find monthly payment for a loan",
      "help me calculate home loan EMI", "car loan EMI",
      "personal loan calculator", "monthly installment", "loan repayment"
    ],
    description: "Calculates monthly EMI, total interest, and repayment schedule for any loan.",
    inputSchema: { loanAmount: "number", interestRate: "number", tenure: "number" },
    route: "/tools/emi",
    supportsMultiTool: true,
    aiFeatures: ["loan-insights"],
    offlineCapable: true,
    testCases: [
      { input: { loanAmount: 500000, interestRate: 9, tenure: 60 }, expectedBehavior: "Returns EMI of ₹10,378/month, total interest ₹122,680 for ₹5L at 9% over 5 years", shouldFail: false },
      { input: { loanAmount: 0, interestRate: 9, tenure: 60 }, expectedBehavior: "Zero loan amount shows inline error 'Loan amount must be greater than 0'", shouldFail: true },
      { input: { loanAmount: 100000, interestRate: 9, tenure: 0 }, expectedBehavior: "Zero tenure shows inline error 'Tenure must be at least 1 month'", shouldFail: true }
    ]
  },

  {
    id: "lineChart",
    name: "Line Chart",
    category: "calculative",
    categoryColor: "#8B5CF6",
    keywords: [
      "line chart", "line graph", "trend graph",
      "how do I create a line chart", "I want to visualize data trends",
      "help me plot a graph", "data visualization", "time series chart",
      "plot data", "chart maker", "graph generator"
    ],
    description: "Creates interactive line charts from custom data points for trend visualization.",
    inputSchema: { data: "string", label: "string" },
    route: "/tools/line-chart",
    supportsMultiTool: true,
    aiFeatures: ["data-insights"],
    offlineCapable: true,
    testCases: [
      { input: { data: "10,20,15,30,25", label: "Sales" }, expectedBehavior: "Renders a smooth line chart with 5 data points and labeled axes", shouldFail: false },
      { input: { data: "", label: "Empty" }, expectedBehavior: "Empty data shows inline error 'Please enter at least 2 data points'", shouldFail: true },
      { input: { data: "10,abc,20", label: "Mixed" }, expectedBehavior: "Non-numeric values are skipped and a warning 'Some values ignored' is shown", shouldFail: true }
    ]
  },

  {
    id: "pieChart",
    name: "Pie Chart",
    category: "calculative",
    categoryColor: "#8B5CF6",
    keywords: [
      "pie chart", "donut chart", "pie graph",
      "how do I create a pie chart", "I want to show data as slices",
      "help me visualize proportions", "share chart", "percentage chart",
      "sector chart", "circular chart", "data distribution"
    ],
    description: "Generates interactive pie charts from labeled data segments for proportion visualization.",
    inputSchema: { data: "string", labels: "string" },
    route: "/tools/pie-chart",
    supportsMultiTool: true,
    aiFeatures: ["data-insights"],
    offlineCapable: true,
    testCases: [
      { input: { data: "30,50,20", labels: "Food,Rent,Other" }, expectedBehavior: "Renders a 3-slice pie chart with correct proportions and legend", shouldFail: false },
      { input: { data: "", labels: "" }, expectedBehavior: "Empty data shows inline error 'Please enter at least 1 data segment'", shouldFail: true },
      { input: { data: "30,50,20", labels: "A" }, expectedBehavior: "Mismatched labels to data: missing labels default to 'Item N'", shouldFail: false }
    ]
  },

  {
    id: "levelMeasure",
    name: "Level Measure",
    category: "calculative",
    categoryColor: "#8B5CF6",
    keywords: [
      "level measure", "spirit level", "bubble level",
      "how do I check if a surface is flat", "I want to level a shelf",
      "help me measure tilt", "inclinometer", "angle measure",
      "is my phone horizontal", "device tilt sensor", "slope angle"
    ],
    description: "Uses device orientation sensors to function as a precision spirit level with tilt angle display.",
    inputSchema: {},
    route: "/tools/level-measure",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: {}, expectedBehavior: "Displays real-time bubble level visual and beta/gamma tilt angles from device orientation sensor", shouldFail: false },
      { input: { calibrate: true }, expectedBehavior: "Stores current device orientation as calibration zero reference point", shouldFail: false },
      { input: { calibrate: "invalid" }, expectedBehavior: "Invalid calibrate value is ignored; level continues to function normally", shouldFail: true }
    ]
  },

  {
    id: "thermometer",
    name: "Thermometer",
    category: "calculative",
    categoryColor: "#8B5CF6",
    keywords: [
      "thermometer", "temperature measure", "device temperature",
      "how do I check device temperature", "I want to see my phone heat",
      "help me monitor temperature", "battery temperature", "thermal sensor",
      "phone overheating", "temperature gauge", "heat monitor"
    ],
    description: "Displays approximate device temperature using the battery thermal sensor with trend tracking.",
    inputSchema: {},
    route: "/tools/thermometer",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: {}, expectedBehavior: "Reads battery temperature from BatteryManager API and displays it on an animated thermometer gauge", shouldFail: false },
      { input: { unit: "fahrenheit" }, expectedBehavior: "Converts battery temperature reading from Celsius to Fahrenheit and updates display", shouldFail: false },
      { input: { unit: 123 }, expectedBehavior: "Invalid numeric unit is ignored; defaults to Celsius without crashing", shouldFail: true }
    ]
  },

  {
    id: "pedometer",
    name: "Pedometer",
    category: "calculative",
    categoryColor: "#8B5CF6",
    keywords: [
      "pedometer", "step counter", "step tracker",
      "how do I count my steps", "I want to track my daily steps",
      "help me measure walking distance", "fitness tracker", "activity tracker",
      "daily steps goal", "calories burned walking", "walk tracker"
    ],
    description: "Counts steps using device accelerometer with daily goal tracking and calorie estimation.",
    inputSchema: { goal: "number" },
    route: "/tools/pedometer",
    supportsMultiTool: false,
    aiFeatures: ["fitness-insights"],
    offlineCapable: true,
    testCases: [
      { input: { goal: 10000 }, expectedBehavior: "Starts step counting via accelerometer and shows progress ring toward 10,000 step goal", shouldFail: false },
      { input: { goal: 0 }, expectedBehavior: "Zero goal shows inline error 'Daily goal must be at least 1 step'", shouldFail: true },
      { input: { goal: -500 }, expectedBehavior: "Negative goal shows inline error 'Goal must be a positive number'", shouldFail: true }
    ]
  },

  // ══════════════════════════════════════════════════════════
  // TOOLS (14)
  // ══════════════════════════════════════════════════════════
  {
    id: "color-picker",
    name: "Color Picker",
    category: "tools",
    categoryColor: "#c9a96e",
    keywords: [
      "color picker", "colour picker", "extract palette", "extract color",
      "get hex code", "shatter image", "particulate", "image colors",
      "color scheme", "color palette generator"
    ],
    description: "Shatter images into color particles, interact with them, and extract palettes using Median Cut.",
    inputSchema: { sample: "string" },
    route: "/tools/color-picker",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: { sample: "abstract" }, expectedBehavior: "Auto-shatters abstract sample image into color particles", shouldFail: false }
    ]
  },
  {
    id: "flashlight",
    name: "Flashlight",
    category: "tools",
    categoryColor: "#10B981",
    keywords: [
      "flashlight", "torch", "flash light",
      "how do I turn on my flashlight", "I want to use my phone as a torch",
      "help me light up the dark", "LED flash", "camera flash torch",
      "phone torch", "bright light", "screen flashlight"
    ],
    description: "Activates device camera flash as a torch or uses full-screen white display as fallback.",
    inputSchema: { mode: "string" },
    route: "/tools/flashlight",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: { mode: "hardware" }, expectedBehavior: "Activates camera flash LED via MediaStream constraints and shows 'Torch ON' status", shouldFail: false },
      { input: { mode: "screen" }, expectedBehavior: "Displays full-screen white brightness overlay as software flashlight fallback", shouldFail: false },
      { input: { mode: 99 }, expectedBehavior: "Invalid numeric mode is ignored; falls back to auto-detection mode", shouldFail: true }
    ]
  },

  {
    id: "audioRecorder",
    name: "Audio Recorder",
    category: "tools",
    categoryColor: "#10B981",
    keywords: [
      "audio recorder", "voice recorder", "sound recorder",
      "how do I record audio", "I want to record my voice",
      "help me record a voice memo", "microphone recorder", "memo recorder",
      "voice note", "record sound", "audio capture"
    ],
    description: "Records audio using the device microphone with waveform visualization and AI transcription.",
    inputSchema: {},
    route: "/tools/audio-recorder",
    supportsMultiTool: false,
    aiFeatures: ["ai-transcription", "ai-summary"],
    offlineCapable: false,
    testCases: [
      { input: {}, expectedBehavior: "Requests microphone access, begins recording, displays real-time waveform animation", shouldFail: false },
      { input: { format: "wav" }, expectedBehavior: "Records in WAV format if supported by MediaRecorder, else falls back to webm", shouldFail: false },
      { input: { duration: -1 }, expectedBehavior: "Negative duration is ignored; recording continues until user stops it", shouldFail: true }
    ]
  },

  {
    id: "qrScanner",
    name: "QR Scanner",
    category: "tools",
    categoryColor: "#10B981",
    keywords: [
      "QR scanner", "QR code reader", "barcode scanner",
      "how do I scan a QR code", "I want to read a barcode",
      "help me scan a QR code with camera", "scan QR", "decode QR",
      "camera scanner", "code reader", "scan barcode"
    ],
    description: "Scans QR codes and barcodes using device camera with torch support and result history.",
    inputSchema: {},
    route: "/tools/qr-scanner",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: {}, expectedBehavior: "Opens camera feed with QR detection overlay and decodes first detected QR code", shouldFail: false },
      { input: { torch: true }, expectedBehavior: "Enables camera torch/flash to illuminate QR code in dark conditions", shouldFail: false },
      { input: { torch: "invalid" }, expectedBehavior: "Invalid torch value is ignored; scanner continues without torch", shouldFail: true }
    ]
  },

  {
    id: "weather",
    name: "Weather",
    category: "tools",
    categoryColor: "#10B981",
    keywords: [
      "weather", "forecast", "weather report",
      "what is the weather today", "how do I check weather in my city",
      "I want to see the forecast", "help me check if it will rain",
      "temperature outside", "humidity", "wind speed", "5 day forecast"
    ],
    description: "Shows real-time weather conditions and 5-day forecast with AI activity recommendations.",
    inputSchema: { location: "string" },
    route: "/tools/weather",
    supportsMultiTool: true,
    aiFeatures: ["ai-recommendations", "activity-suggestions", "weather-alerts"],
    offlineCapable: false,
    testCases: [
      { input: { location: "Chennai" }, expectedBehavior: "Displays current temperature, humidity, wind speed and 5-day forecast for Chennai", shouldFail: false },
      { input: { location: "" }, expectedBehavior: "Empty location triggers geolocation request and falls back to manual city input on denial", shouldFail: false },
      { input: { location: "xyznotacity12345" }, expectedBehavior: "Invalid city shows inline error 'City not found — please check the name'", shouldFail: true }
    ]
  },

  {
    id: "translator",
    name: "Translator",
    category: "tools",
    categoryColor: "#10B981",
    keywords: [
      "translator", "translate", "language translator",
      "how do I translate text to Hindi", "I want to translate to Spanish",
      "help me understand this in Tamil", "text translation",
      "language converter", "multilingual", "Google translate alternative"
    ],
    description: "Translates text between 100+ languages using AI with accent and regional dialect support.",
    inputSchema: { text: "string", targetLanguage: "string" },
    route: "/tools/translator",
    supportsMultiTool: true,
    aiFeatures: ["ai-translation", "dialect-detection", "pronunciation-guide"],
    offlineCapable: false,
    testCases: [
      { input: { text: "Hello, how are you?", targetLanguage: "Tamil" }, expectedBehavior: "Returns accurate Tamil translation 'வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?' within 3 seconds", shouldFail: false },
      { input: { text: "", targetLanguage: "Hindi" }, expectedBehavior: "Empty text shows inline error 'Please enter text to translate'", shouldFail: true },
      { input: { text: "Hello", targetLanguage: "" }, expectedBehavior: "Empty language shows inline error 'Please select a target language'", shouldFail: true }
    ]
  },

  {
    id: "todoList",
    name: "To-Do List",
    category: "tools",
    categoryColor: "#10B981",
    keywords: [
      "to-do list", "todo list", "task manager",
      "how do I create a task list", "I want to manage my tasks",
      "help me organize my work", "add a task", "check off tasks",
      "reminder list", "productivity list", "task organizer"
    ],
    description: "A persistent task manager with categories, priority levels, and completion tracking.",
    inputSchema: { task: "string", priority: "string" },
    route: "/tools/todo-list",
    supportsMultiTool: true,
    aiFeatures: ["ai-task-suggestions"],
    offlineCapable: true,
    testCases: [
      { input: { task: "Buy groceries", priority: "medium" }, expectedBehavior: "Adds 'Buy groceries' to list with medium priority badge and saves to localStorage", shouldFail: false },
      { input: { task: "", priority: "high" }, expectedBehavior: "Empty task shows inline error 'Task cannot be empty'", shouldFail: true },
      { input: { task: "A".repeat(500), priority: "low" }, expectedBehavior: "Task exceeding 200 characters shows error 'Task is too long (max 200 characters)'", shouldFail: true }
    ]
  },

  {
    id: "compass",
    name: "Compass",
    category: "tools",
    categoryColor: "#10B981",
    keywords: [
      "compass", "magnetic compass", "direction finder",
      "how do I find north", "I want to see which direction I'm facing",
      "help me navigate with compass", "heading compass", "bearing finder",
      "north south east west", "magnetic north", "navigation compass"
    ],
    description: "A hardware compass using device magnetometer with true north and magnetic north toggle.",
    inputSchema: {},
    route: "/tools/compass",
    supportsMultiTool: false,
    aiFeatures: ["navigation-guidance"],
    offlineCapable: true,
    testCases: [
      { input: {}, expectedBehavior: "Displays real-time compass rose rotating based on device orientation with degree heading", shouldFail: false },
      { input: { mode: "true-north" }, expectedBehavior: "Adjusts declination and shows true geographic north instead of magnetic north", shouldFail: false },
      { input: { mode: 999 }, expectedBehavior: "Invalid numeric mode is ignored; defaults to magnetic north mode", shouldFail: true }
    ]
  },

  {
    id: "qrGenerator",
    name: "QR Generator",
    category: "tools",
    categoryColor: "#10B981",
    keywords: [
      "QR generator", "QR code generator", "create QR code",
      "how do I make a QR code", "I want to generate a QR code for a URL",
      "help me create a QR code for my contact", "QR code maker",
      "barcode generator", "QR for link", "custom QR code"
    ],
    description: "Generates downloadable QR codes for URLs, text, contacts, and custom data.",
    inputSchema: { content: "string", format: "string" },
    route: "/tools/qr-generator",
    supportsMultiTool: true,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: { content: "https://example.com", format: "url" }, expectedBehavior: "Generates a scannable QR code for the URL and offers PNG/SVG download", shouldFail: false },
      { input: { content: "", format: "text" }, expectedBehavior: "Empty content shows inline error 'Please enter content to encode'", shouldFail: true },
      { input: { content: "A".repeat(5000), format: "text" }, expectedBehavior: "Content exceeding QR capacity shows error 'Content is too long for a QR code'", shouldFail: true }
    ]
  },

  {
    id: "unitConverter",
    name: "Unit Converter",
    category: "tools",
    categoryColor: "#10B981",
    keywords: [
      "unit converter", "unit conversion", "measurement converter",
      "how do I convert km to miles", "I want to convert kilograms to pounds",
      "help me convert Celsius to Fahrenheit", "metric to imperial",
      "convert units", "measurement units", "length weight temperature conversion"
    ],
    description: "Converts between 50+ units across length, weight, temperature, volume, speed, and more.",
    inputSchema: { value: "number", fromUnit: "string", toUnit: "string" },
    route: "/tools/unit-converter",
    supportsMultiTool: true,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: { value: 100, fromUnit: "km", toUnit: "miles" }, expectedBehavior: "Returns 62.14 miles with accurate conversion formula and unit labels", shouldFail: false },
      { input: { value: 0, fromUnit: "kg", toUnit: "lbs" }, expectedBehavior: "Zero value returns 0 in target unit without error", shouldFail: false },
      { input: { value: 10, fromUnit: "kg", toUnit: "km" }, expectedBehavior: "Incompatible unit categories shows error 'Cannot convert weight to length'", shouldFail: true }
    ]
  },

  {
    id: "cashSeparator",
    name: "Cash Separator",
    category: "tools",
    categoryColor: "#10B981",
    keywords: [
      "cash separator", "denomination calculator", "note counter",
      "how do I split cash into denominations", "I want to find currency notes for an amount",
      "help me count cash denominations", "rupee denominations",
      "break down amount", "currency breakdown", "money denominations"
    ],
    description: "Breaks down any cash amount into the minimum set of Indian currency denominations.",
    inputSchema: { amount: "number" },
    route: "/tools/cash-separator",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: { amount: 4350 }, expectedBehavior: "Returns breakdown: 4×₹500, 1×₹200, 1×₹100, 1×₹50 using minimum notes", shouldFail: false },
      { input: { amount: 0 }, expectedBehavior: "Zero amount shows inline error 'Amount must be greater than 0'", shouldFail: true },
      { input: { amount: -500 }, expectedBehavior: "Negative amount shows inline error 'Amount cannot be negative'", shouldFail: true }
    ]
  },

  {
    id: "whatsappDirect",
    name: "WhatsApp Direct",
    category: "tools",
    categoryColor: "#10B981",
    keywords: [
      "whatsapp direct", "whatsapp without saving", "send whatsapp to unsaved number",
      "how do I send WhatsApp to a number without saving", "I want to message on WhatsApp",
      "help me open WhatsApp for a number", "WhatsApp link generator",
      "wa.me link", "WhatsApp message", "chat without contact"
    ],
    description: "Opens a WhatsApp chat with any phone number without saving it to contacts.",
    inputSchema: { phoneNumber: "string", message: "string", countryCode: "string" },
    route: "/tools/whatsapp-direct",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: false,
    testCases: [
      { input: { phoneNumber: "9876543210", message: "Hello!", countryCode: "+91" }, expectedBehavior: "Opens wa.me/919876543210 link with pre-filled 'Hello!' message", shouldFail: false },
      { input: { phoneNumber: "", message: "Hi", countryCode: "+91" }, expectedBehavior: "Empty phone number shows inline error 'Please enter a valid phone number'", shouldFail: true },
      { input: { phoneNumber: "abc123", message: "", countryCode: "+91" }, expectedBehavior: "Non-numeric phone number shows inline error 'Phone number must contain only digits'", shouldFail: true }
    ]
  },

  {
    id: "noiseDetector",
    name: "Noise Detector",
    category: "tools",
    categoryColor: "#10B981",
    keywords: [
      "noise detector", "decibel meter", "sound level meter",
      "how do I measure noise level", "I want to check dB level",
      "help me measure how loud it is", "dB meter", "sound meter",
      "ambient noise level", "volume meter", "acoustic measurement"
    ],
    description: "Measures real-time ambient noise levels in decibels using the device microphone.",
    inputSchema: {},
    route: "/tools/noise-detector",
    supportsMultiTool: false,
    aiFeatures: ["sound-classification"],
    offlineCapable: true,
    testCases: [
      { input: {}, expectedBehavior: "Requests microphone, shows real-time dB meter with color-coded quiet/moderate/loud zones", shouldFail: false },
      { input: { threshold: 80 }, expectedBehavior: "Sets noise alert threshold at 80dB and flashes warning when exceeded", shouldFail: false },
      { input: { threshold: -10 }, expectedBehavior: "Negative threshold shows inline error 'Threshold must be between 0 and 120 dB'", shouldFail: true }
    ]
  },

  {
    id: "metalDetector",
    name: "Metal Detector",
    category: "tools",
    categoryColor: "#10B981",
    keywords: [
      "metal detector", "magnetic field detector", "magnetometer",
      "how do I detect metal with my phone", "I want to find metal nearby",
      "help me use my phone as a metal detector", "magnetic sensor",
      "ferrous metal detection", "phone magnetometer", "sensor detector"
    ],
    description: "Detects nearby metal objects using device magnetometer with calibration and haptic feedback.",
    inputSchema: {},
    route: "/tools/metal-detector",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: {}, expectedBehavior: "Calibrates magnetic baseline over 2 seconds then beeps and vibrates when significant deviation detected", shouldFail: false },
      { input: { sensitivity: "high" }, expectedBehavior: "High sensitivity mode lowers detection threshold for small metal objects", shouldFail: false },
      { input: { sensitivity: -1 }, expectedBehavior: "Invalid sensitivity value is ignored; defaults to medium sensitivity", shouldFail: true }
    ]
  },

  {
    id: "currencyConverter",
    name: "Currency Converter",
    category: "tools",
    categoryColor: "#10B981",
    keywords: [
      "currency converter", "foreign exchange", "forex calculator",
      "how do I convert USD to INR", "I want to exchange currency",
      "help me find today's exchange rate", "exchange rate calculator",
      "dollar to rupee", "euro to pound", "live exchange rates"
    ],
    description: "Converts between 150+ currencies using live exchange rates with offline cached fallback.",
    inputSchema: { amount: "number", fromCurrency: "string", toCurrency: "string" },
    route: "/tools/currency-converter",
    supportsMultiTool: true,
    aiFeatures: ["rate-insights"],
    offlineCapable: false,
    testCases: [
      { input: { amount: 100, fromCurrency: "USD", toCurrency: "INR" }, expectedBehavior: "Returns current INR equivalent with live exchange rate and timestamp", shouldFail: false },
      { input: { amount: 0, fromCurrency: "EUR", toCurrency: "GBP" }, expectedBehavior: "Zero amount returns 0 without crashing, shows exchange rate information", shouldFail: false },
      { input: { amount: 100, fromCurrency: "XXX", toCurrency: "INR" }, expectedBehavior: "Invalid currency code shows inline error 'Currency code XXX not found'", shouldFail: true }
    ]
  },

  // ══════════════════════════════════════════════════════════
  // HEALTH (7)
  // ══════════════════════════════════════════════════════════
  {
    id: "breathControl",
    name: "Breath Control",
    category: "health",
    categoryColor: "#EC4899",
    keywords: [
      "breath control", "breathing exercise", "meditation breathing",
      "how do I do box breathing", "I want to calm my anxiety",
      "help me with breathing techniques", "4-7-8 breathing",
      "deep breathing", "pranayama", "stress relief breathing"
    ],
    description: "Guides structured breathing exercises including box breathing, 4-7-8, and Wim Hof techniques.",
    inputSchema: { technique: "string", cycles: "number" },
    route: "/tools/breath-control",
    supportsMultiTool: false,
    aiFeatures: ["technique-recommendations"],
    offlineCapable: true,
    testCases: [
      { input: { technique: "box", cycles: 4 }, expectedBehavior: "Starts animated 4-4-4-4 box breathing guide with expanding/contracting circle for 4 cycles", shouldFail: false },
      { input: { technique: "", cycles: 3 }, expectedBehavior: "Empty technique shows technique selection screen with options", shouldFail: false },
      { input: { technique: "box", cycles: 0 }, expectedBehavior: "Zero cycles shows inline error 'Cycles must be at least 1'", shouldFail: true }
    ]
  },

  {
    id: "periodTracker",
    name: "Period Tracker",
    category: "health",
    categoryColor: "#EC4899",
    keywords: [
      "period tracker", "menstrual cycle tracker", "menstruation tracker",
      "how do I track my period", "I want to predict my next period",
      "help me log my menstrual cycle", "cycle calendar",
      "ovulation tracker", "fertility tracker", "menstrual health"
    ],
    description: "Tracks menstrual cycles, predicts next period and ovulation window with historical logging.",
    inputSchema: { lastPeriodDate: "string", cycleLength: "number" },
    route: "/tools/periods-tracker",
    supportsMultiTool: false,
    aiFeatures: ["cycle-prediction", "symptom-insights"],
    offlineCapable: true,
    testCases: [
      { input: { lastPeriodDate: "2024-06-01", cycleLength: 28 }, expectedBehavior: "Predicts next period on June 29 and ovulation window around June 15, shows on calendar", shouldFail: false },
      { input: { lastPeriodDate: "", cycleLength: 28 }, expectedBehavior: "Empty date shows inline error 'Please enter your last period date'", shouldFail: true },
      { input: { lastPeriodDate: "2024-06-01", cycleLength: 0 }, expectedBehavior: "Zero cycle length shows inline error 'Cycle length must be between 21 and 45 days'", shouldFail: true }
    ]
  },

  {
    id: "brainReaction",
    name: "Brain Reaction",
    category: "health",
    categoryColor: "#EC4899",
    keywords: [
      "brain reaction", "reaction time test", "reflex test",
      "how do I test my reaction time", "I want to measure my reflexes",
      "help me test how fast I react", "stimulus response test",
      "cognitive speed", "reflex speed", "response time"
    ],
    description: "Measures human reaction time in milliseconds with performance analytics and personal bests.",
    inputSchema: {},
    route: "/tools/brain-reaction",
    supportsMultiTool: false,
    aiFeatures: ["performance-analysis"],
    offlineCapable: true,
    testCases: [
      { input: {}, expectedBehavior: "Displays wait screen, triggers random stimulus after 1-4 seconds, measures tap response time in ms", shouldFail: false },
      { input: { difficulty: "easy" }, expectedBehavior: "Easy mode uses longer random delay window (1-3s) and larger tap target", shouldFail: false },
      { input: { tapBeforeStimulus: true }, expectedBehavior: "Pre-stimulus tap detected: shows 'Too early! Wait for the signal' and restarts round", shouldFail: true }
    ]
  },

  {
    id: "hydrationPro",
    name: "Hydration Pro",
    category: "health",
    categoryColor: "#EC4899",
    keywords: [
      "hydration tracker", "water tracker", "daily water intake",
      "how do I track water intake", "I want to log how much water I drank",
      "help me reach my daily water goal", "water intake calculator",
      "hydration reminder", "drink water", "water consumption log"
    ],
    description: "Tracks daily water consumption toward a personalized hydration goal with intake logging.",
    inputSchema: { amount: "number", unit: "string" },
    route: "/tools/water-tracker",
    supportsMultiTool: true,
    aiFeatures: ["hydration-recommendations"],
    offlineCapable: true,
    testCases: [
      { input: { amount: 250, unit: "ml" }, expectedBehavior: "Logs 250ml intake, updates progress bar toward daily goal, saves to history", shouldFail: false },
      { input: { amount: 0, unit: "ml" }, expectedBehavior: "Zero amount shows inline error 'Amount must be greater than 0'", shouldFail: true },
      { input: { amount: -100, unit: "ml" }, expectedBehavior: "Negative amount shows inline error 'Water intake cannot be negative'", shouldFail: true }
    ]
  },

  {
    id: "visionStudio",
    name: "Vision Studio",
    category: "health",
    categoryColor: "#EC4899",
    keywords: [
      "vision studio", "eye test", "vision test",
      "how do I test my eyesight", "I want to check my vision",
      "help me do an eye exam at home", "Snellen chart", "color blind test",
      "eye health check", "visual acuity test", "ishihara test"
    ],
    description: "Comprehensive vision screening including Snellen acuity, Ishihara color blindness, and Amsler grid tests.",
    inputSchema: {},
    route: "/tools/vision-studio",
    supportsMultiTool: false,
    aiFeatures: ["vision-assessment"],
    offlineCapable: true,
    testCases: [
      { input: {}, expectedBehavior: "Presents Snellen letter chart at standardized viewing distance with UP/DOWN difficulty controls", shouldFail: false },
      { input: { test: "ishihara" }, expectedBehavior: "Displays Ishihara color plates to detect red-green color blindness", shouldFail: false },
      { input: { test: "invalid_mode" }, expectedBehavior: "Unknown test mode shows inline error and falls back to Snellen chart", shouldFail: true }
    ]
  },

  {
    id: "dreamFlow",
    name: "Dream Flow",
    category: "health",
    categoryColor: "#EC4899",
    keywords: [
      "dream flow", "sleep assistant", "sleep tracker",
      "how do I improve my sleep", "I want to track my sleep quality",
      "help me fall asleep faster", "sleep journal", "sleep analysis",
      "bedtime reminder", "sleep hygiene", "insomnia help"
    ],
    description: "Tracks sleep patterns, provides AI sleep insights, and guides relaxation before bedtime.",
    inputSchema: { bedtime: "string", wakeTime: "string" },
    route: "/tools/sleep-assistant",
    supportsMultiTool: false,
    aiFeatures: ["sleep-insights", "relaxation-guide"],
    offlineCapable: true,
    testCases: [
      { input: { bedtime: "22:30", wakeTime: "06:30" }, expectedBehavior: "Records 8-hour sleep entry and provides quality assessment and AI tips", shouldFail: false },
      { input: { bedtime: "", wakeTime: "06:30" }, expectedBehavior: "Empty bedtime shows inline error 'Please enter a bedtime'", shouldFail: true },
      { input: { bedtime: "25:00", wakeTime: "06:30" }, expectedBehavior: "Invalid time format shows inline error 'Please enter a valid time in HH:MM format'", shouldFail: true }
    ]
  },

  {
    id: "nutritionExpert",
    name: "Nutrition Expert",
    category: "health",
    categoryColor: "#EC4899",
    keywords: [
      "nutrition expert", "calorie calculator", "food nutrition",
      "how many calories in chicken", "I want to find nutrition facts",
      "help me plan my diet", "macro calculator", "food calories",
      "protein carbs fat", "nutritional information", "diet planner"
    ],
    description: "Provides AI-powered nutritional analysis, calorie counts, and personalized meal planning.",
    inputSchema: { food: "string" },
    route: "/tools/nutrition-expert",
    supportsMultiTool: true,
    aiFeatures: ["ai-nutrition-analysis", "meal-planning", "calorie-tracking"],
    offlineCapable: false,
    testCases: [
      { input: { food: "2 boiled eggs and a banana" }, expectedBehavior: "Returns calories (~267 kcal), macros (protein, carbs, fat) and micronutrient highlights for the meal", shouldFail: false },
      { input: { food: "" }, expectedBehavior: "Empty food input shows inline error 'Please enter a food item or meal description'", shouldFail: true },
      { input: { food: "xyzabc notafood 12345" }, expectedBehavior: "Unrecognized food shows 'Unable to find nutritional data for this item — please try a different description'", shouldFail: true }
    ]
  },

  // ══════════════════════════════════════════════════════════
  // TEXT (6 spec + textRepeater = 7)
  // ══════════════════════════════════════════════════════════
  {
    id: "textScanner",
    name: "Doc & Image to Text",
    category: "text",
    categoryColor: "#F59E0B",
    keywords: [
      "text scanner", "OCR", "image to text",
      "how do I extract text from an image", "I want to scan text from a photo",
      "help me read text from a picture", "optical character recognition",
      "scan document text", "photo to text", "text recognition",
      "extract text from pdf", "pdf to text", "docx to text",
      "read text from docx", "convert word to text", "document to text"
    ],
    description: "Extracts text from images, PDF, and Word documents locally using on-device OCR and document parsers.",
    inputSchema: { image: "image", file: "file" },
    route: "/tools/text-scanner",
    supportsMultiTool: true,
    aiFeatures: ["ai-text-extraction", "ai-formatting"],
    offlineCapable: true,
    testCases: [
      { input: { image: "base64_image_data" }, expectedBehavior: "Extracts and displays all readable text from the image with copy button", shouldFail: false },
      { input: { image: "" }, expectedBehavior: "Empty image shows inline prompt 'Upload or capture an image to scan text'", shouldFail: true },
      { input: { image: "not_valid_base64!" }, expectedBehavior: "Invalid image data shows error 'Unable to process image — please upload a valid file'", shouldFail: true }
    ]
  },

  {
    id: "pdfWordConverter",
    name: "PDF ↔ Word Converter",
    category: "text",
    categoryColor: "#F59E0B",
    keywords: [
      "pdf to word", "word to pdf", "convert pdf to word",
      "convert docx to pdf", "convert word to pdf", "pdf 2 word",
      "word 2 pdf", "pdf word converter", "pdf word",
      "make docx from pdf", "pdf to docx"
    ],
    description: "Convert PDF documents to editable Word files (DOCX) and Word documents to PDF locally on your device.",
    inputSchema: { file: "file" },
    route: "/tools/pdf-word-converter",
    supportsMultiTool: true,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: {}, expectedBehavior: "Drop zone displayed for file conversion selection", shouldFail: false }
    ]
  },

  {
    id: "textEncrypt",
    name: "Text Encrypt",
    category: "text",
    categoryColor: "#F59E0B",
    keywords: [
      "text encrypt", "text encryption", "encode text",
      "how do I encrypt a message", "I want to hide text",
      "help me encode a secret message", "Caesar cipher",
      "AES encryption", "message encryption", "secure text"
    ],
    description: "Encrypts and decrypts text using Caesar cipher, Base64, and AES encryption methods.",
    inputSchema: { text: "string", method: "string", key: "string" },
    route: "/tools/text-encrypt",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: { text: "Hello World", method: "caesar", key: "3" }, expectedBehavior: "Returns 'Khoor Zruog' — each letter shifted 3 positions forward in alphabet", shouldFail: false },
      { input: { text: "", method: "base64", key: "" }, expectedBehavior: "Empty text shows inline error 'Please enter text to encrypt'", shouldFail: true },
      { input: { text: "Hello", method: "invalid_method", key: "" }, expectedBehavior: "Unknown method shows inline error and falls back to available method list", shouldFail: true }
    ]
  },

  {
    id: "passwordGenerator",
    name: "Password Generator",
    category: "text",
    categoryColor: "#F59E0B",
    keywords: [
      "password generator", "secure password", "random password",
      "how do I create a strong password", "I want to generate a secure password",
      "help me make a random password", "strong password maker",
      "password strength", "complex password", "password creator"
    ],
    description: "Generates cryptographically secure random passwords with configurable length and character sets.",
    inputSchema: { length: "number", uppercase: "boolean", numbers: "boolean", symbols: "boolean" },
    route: "/tools/random-password",
    supportsMultiTool: false,
    aiFeatures: ["password-strength-analysis"],
    offlineCapable: true,
    testCases: [
      { input: { length: 16, uppercase: true, numbers: true, symbols: true }, expectedBehavior: "Generates a 16-character password with mixed case, digits, and symbols; shows strength meter as 'Strong'", shouldFail: false },
      { input: { length: 0, uppercase: true, numbers: true, symbols: false }, expectedBehavior: "Zero length shows inline error 'Password length must be at least 4 characters'", shouldFail: true },
      { input: { length: 8, uppercase: false, numbers: false, symbols: false }, expectedBehavior: "All options disabled defaults to lowercase letters only and shows warning 'Password may be weak'", shouldFail: false }
    ]
  },

  {
    id: "dice",
    name: "Dice",
    category: "text",
    categoryColor: "#F59E0B",
    keywords: [
      "dice", "dice roller", "random dice",
      "how do I roll a dice", "I want to roll virtual dice",
      "help me simulate a dice roll", "random number generator",
      "D6 dice", "D20 dice", "tabletop RPG dice", "roll the die"
    ],
    description: "Simulates dice rolls for any number of sides and count with animated roll display.",
    inputSchema: { sides: "number", count: "number" },
    route: "/tools/random-password",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: { sides: 6, count: 2 }, expectedBehavior: "Rolls 2 six-sided dice, shows animated result and sum between 2 and 12", shouldFail: false },
      { input: { sides: 0, count: 1 }, expectedBehavior: "Zero sides shows inline error 'Dice must have at least 2 sides'", shouldFail: true },
      { input: { sides: 6, count: 0 }, expectedBehavior: "Zero count shows inline error 'Must roll at least 1 die'", shouldFail: true }
    ]
  },

  {
    id: "typeTester",
    name: "Type Tester",
    category: "text",
    categoryColor: "#F59E0B",
    keywords: [
      "type tester", "typing speed test", "WPM test",
      "how do I test my typing speed", "I want to measure my WPM",
      "help me improve my typing", "words per minute",
      "typing accuracy", "keyboard speed test", "touch typing test"
    ],
    description: "Tests typing speed in WPM with accuracy percentage and personal best tracking.",
    inputSchema: { difficulty: "string" },
    route: "/tools/type-tester",
    supportsMultiTool: false,
    aiFeatures: ["performance-analysis"],
    offlineCapable: true,
    testCases: [
      { input: { difficulty: "medium" }, expectedBehavior: "Presents a 60-second typing challenge and displays WPM, accuracy, and errors on completion", shouldFail: false },
      { input: { difficulty: "" }, expectedBehavior: "Empty difficulty defaults to medium difficulty without error", shouldFail: false },
      { input: { difficulty: "extreme_hard_xyz" }, expectedBehavior: "Unknown difficulty falls back to medium and shows a notification 'Unknown difficulty — using Medium'", shouldFail: true }
    ]
  },

  {
    id: "textToBinary",
    name: "Text to Binary",
    category: "text",
    categoryColor: "#F59E0B",
    keywords: [
      "text to binary", "binary converter", "ASCII to binary",
      "how do I convert text to binary", "I want to encode text in binary",
      "help me decode binary to text", "binary decoder", "binary encoder",
      "0s and 1s text", "binary code", "character to binary"
    ],
    description: "Converts text to binary (8-bit ASCII) and decodes binary back to readable text.",
    inputSchema: { text: "string", mode: "string" },
    route: "/tools/text-to-binary",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: { text: "Hi", mode: "encode" }, expectedBehavior: "Returns '01001000 01101001' — correct 8-bit binary for 'H' and 'i'", shouldFail: false },
      { input: { text: "", mode: "encode" }, expectedBehavior: "Empty text shows inline error 'Please enter text to convert'", shouldFail: true },
      { input: { text: "01001000 99999999", mode: "decode" }, expectedBehavior: "Invalid binary sequence shows error 'Invalid binary — only 0s and 1s allowed in 8-bit groups'", shouldFail: true }
    ]
  },

  {
    id: "textRepeater",
    name: "Text Repeater",
    category: "text",
    categoryColor: "#F59E0B",
    keywords: [
      "text repeater", "repeat text", "duplicate text",
      "how do I repeat text multiple times", "I want to copy text 100 times",
      "help me generate repeated strings", "text multiplier",
      "string repeat", "text copy generator", "repeated content"
    ],
    description: "Repeats any text a specified number of times with configurable separator.",
    inputSchema: { text: "string", count: "number", separator: "string" },
    route: "/tools/text-repeater",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: { text: "Hello", count: 3, separator: ", " }, expectedBehavior: "Returns 'Hello, Hello, Hello' with separator between each repetition", shouldFail: false },
      { input: { text: "", count: 5, separator: " " }, expectedBehavior: "Empty text shows inline error 'Please enter text to repeat'", shouldFail: true },
      { input: { text: "Hi", count: 0, separator: " " }, expectedBehavior: "Zero count shows inline error 'Repeat count must be at least 1'", shouldFail: true }
    ]
  },

  // ══════════════════════════════════════════════════════════
  // MEDIA (4)
  // ══════════════════════════════════════════════════════════
  {
    id: "videoToAudio",
    name: "Video to Audio",
    category: "media",
    categoryColor: "#EF4444",
    keywords: [
      "video to audio", "extract audio from video", "MP4 to MP3",
      "how do I convert video to audio", "I want to extract the audio from an MP4",
      "help me get MP3 from video", "audio extractor",
      "video converter", "strip audio", "convert video to music"
    ],
    description: "Extracts and converts audio from video files to MP3/WAV using in-browser FFmpeg.",
    inputSchema: { file: "file" },
    route: "/tools/video-to-audio",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: { file: "video.mp4" }, expectedBehavior: "Extracts audio track, converts to MP3, and offers download with progress indicator", shouldFail: false },
      { input: { file: "" }, expectedBehavior: "No file selected shows inline prompt 'Please upload a video file to convert'", shouldFail: true },
      { input: { file: "document.pdf" }, expectedBehavior: "Non-video file shows error 'Please upload a valid video file (MP4, AVI, MOV, MKV)'", shouldFail: true }
    ]
  },

  {
    id: "pdfCreator",
    name: "PDF Creator",
    category: "media",
    categoryColor: "#EF4444",
    keywords: [
      "PDF creator", "PDF generator", "create PDF",
      "how do I create a PDF document", "I want to convert text to PDF",
      "help me make a PDF file", "PDF maker", "text to PDF",
      "document creator", "PDF from text", "export PDF"
    ],
    description: "Creates downloadable PDF documents from text, images, or formatted content using jsPDF.",
    inputSchema: { content: "string", title: "string" },
    route: "/tools/pdf-creator",
    supportsMultiTool: false,
    aiFeatures: ["ai-formatting"],
    offlineCapable: true,
    testCases: [
      { input: { content: "This is my report content", title: "My Report" }, expectedBehavior: "Generates a PDF with the title as heading and content in body, ready for download", shouldFail: false },
      { input: { content: "", title: "Empty Doc" }, expectedBehavior: "Empty content shows inline error 'Please enter content to include in the PDF'", shouldFail: true },
      { input: { content: "Content", title: "" }, expectedBehavior: "Empty title defaults to 'Untitled Document' without error", shouldFail: false }
    ]
  },

  {
    id: "imageCompressor",
    name: "Image Compressor",
    category: "media",
    categoryColor: "#EF4444",
    keywords: [
      "image compressor", "photo compressor", "compress image",
      "how do I reduce image file size", "I want to compress a photo",
      "help me make an image smaller", "image optimizer",
      "reduce image size", "photo size reducer", "JPG compressor"
    ],
    description: "Compresses JPEG, PNG, and WebP images in-browser without quality loss using Canvas API.",
    inputSchema: { image: "image", quality: "number" },
    route: "/tools/image-compressor",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: { image: "photo.jpg", quality: 80 }, expectedBehavior: "Compresses image to 80% quality and shows before/after file size comparison with download", shouldFail: false },
      { input: { image: "", quality: 70 }, expectedBehavior: "No image uploaded shows inline prompt 'Please upload an image to compress'", shouldFail: true },
      { input: { image: "photo.jpg", quality: 0 }, expectedBehavior: "Quality of 0 shows inline error 'Quality must be between 1 and 100'", shouldFail: true }
    ]
  },

  {
    id: "counter",
    name: "Counter",
    category: "media",
    categoryColor: "#EF4444",
    keywords: [
      "counter", "click counter", "tally counter",
      "how do I count things with my phone", "I want a tally counter",
      "help me count people or items", "number counter",
      "manual counter", "attendance counter", "inventory count"
    ],
    description: "A configurable tap counter with increment, decrement, reset, and custom step support.",
    inputSchema: { step: "number", startValue: "number" },
    route: "/tools/counter",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: { step: 1, startValue: 0 }, expectedBehavior: "Starts at 0; each tap increments by 1; displays count prominently with haptic feedback", shouldFail: false },
      { input: { step: 0, startValue: 0 }, expectedBehavior: "Zero step shows inline error 'Step must be at least 1'", shouldFail: true },
      { input: { step: -5, startValue: 100 }, expectedBehavior: "Negative step shows inline error 'Step must be a positive number'", shouldFail: true }
    ]
  },

  // ══════════════════════════════════════════════════════════
  // DEVICE (9)
  // ══════════════════════════════════════════════════════════
  {
    id: "battery",
    name: "Battery",
    category: "device",
    categoryColor: "#6366F1",
    keywords: [
      "battery", "battery level", "battery status",
      "how do I check my battery percentage", "I want to see battery health",
      "help me monitor battery usage", "charging status",
      "battery life", "power level", "battery drain"
    ],
    description: "Displays real-time battery level, charging status, and estimated time to charge or drain.",
    inputSchema: {},
    route: "/tools/battery",
    supportsMultiTool: false,
    aiFeatures: ["usage-prediction"],
    offlineCapable: true,
    testCases: [
      { input: {}, expectedBehavior: "Shows current battery percentage, charging state, and estimated hours remaining using BatteryManager API", shouldFail: false },
      { input: { alert: 20 }, expectedBehavior: "Sets low battery alert at 20% and shows notification when level drops below threshold", shouldFail: false },
      { input: { alert: 150 }, expectedBehavior: "Alert level over 100% shows inline error 'Battery alert must be between 1 and 99%'", shouldFail: true }
    ]
  },

  {
    id: "deviceInfo",
    name: "Device Info",
    category: "device",
    categoryColor: "#6366F1",
    keywords: [
      "device info", "device information", "phone specs",
      "how do I find my device details", "I want to see my phone specifications",
      "help me check my device model", "system information",
      "hardware info", "browser info", "screen resolution"
    ],
    description: "Displays comprehensive device information including OS, browser, screen, and hardware specs.",
    inputSchema: {},
    route: "/tools/device-info",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: {}, expectedBehavior: "Displays OS, browser version, screen resolution, device memory, CPU cores, and touch support", shouldFail: false },
      { input: { section: "display" }, expectedBehavior: "Shows expanded display section with screen size, DPI, pixel ratio, and color depth", shouldFail: false },
      { input: { section: "nonexistent_section" }, expectedBehavior: "Unknown section is ignored; all sections are displayed as default", shouldFail: true }
    ]
  },

  {
    id: "sensorInfo",
    name: "Sensor Info",
    category: "device",
    categoryColor: "#6366F1",
    keywords: [
      "sensor info", "device sensors", "phone sensors",
      "how do I see what sensors my phone has", "I want to check available sensors",
      "help me test device sensors", "accelerometer gyroscope",
      "magnetometer barometer", "sensor list", "hardware sensors"
    ],
    description: "Lists and tests all available device sensors including accelerometer, gyroscope, and magnetometer.",
    inputSchema: {},
    route: "/tools/sensor-info",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: {}, expectedBehavior: "Lists all detected sensors with real-time readings for each available sensor type", shouldFail: false },
      { input: { test: "accelerometer" }, expectedBehavior: "Highlights accelerometer card and shows live X/Y/Z acceleration values", shouldFail: false },
      { input: { test: "nonexistent_sensor" }, expectedBehavior: "Unknown sensor type is ignored; all available sensors are listed normally", shouldFail: true }
    ]
  },

  {
    id: "storage",
    name: "Storage",
    category: "device",
    categoryColor: "#6366F1",
    keywords: [
      "storage", "device storage", "phone storage",
      "how do I check my phone storage", "I want to see available disk space",
      "help me manage storage", "memory usage",
      "free storage", "storage analyzer", "disk space"
    ],
    description: "Analyzes device storage usage showing used, available, and total capacity from StorageManager API.",
    inputSchema: {},
    route: "/tools/storage",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: {}, expectedBehavior: "Displays total, used, and free storage as a visual bar chart with percentage labels", shouldFail: false },
      { input: { refresh: true }, expectedBehavior: "Re-queries StorageManager and updates storage display without page reload", shouldFail: false },
      { input: { refresh: "auto" }, expectedBehavior: "String refresh value is ignored; manual trigger still works normally", shouldFail: true }
    ]
  },

  {
    id: "speakerCleaner",
    name: "Speaker Cleaner",
    category: "device",
    categoryColor: "#6366F1",
    keywords: [
      "speaker cleaner", "speaker dust remover", "water from speaker",
      "how do I clean my phone speaker", "I want to remove water from speaker",
      "help me fix muffled speaker", "speaker test tone",
      "audio frequency sweep", "speaker repair", "dust eject"
    ],
    description: "Plays frequency sweep tones to dislodge dust and water from device speakers.",
    inputSchema: { duration: "number", startFreq: "number", endFreq: "number" },
    route: "/tools/speaker-cleaner",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: { duration: 30, startFreq: 100, endFreq: 400 }, expectedBehavior: "Plays 30-second sine wave sweep from 100Hz to 400Hz with volume control slider", shouldFail: false },
      { input: { duration: 0, startFreq: 100, endFreq: 400 }, expectedBehavior: "Zero duration shows inline error 'Duration must be at least 5 seconds'", shouldFail: true },
      { input: { duration: 30, startFreq: 400, endFreq: 100 }, expectedBehavior: "Reversed frequencies (end < start) plays descending sweep from 400Hz down to 100Hz", shouldFail: false }
    ]
  },

  {
    id: "cpuInfo",
    name: "CPU Info",
    category: "device",
    categoryColor: "#6366F1",
    keywords: [
      "CPU info", "processor info", "CPU details",
      "how do I find my processor details", "I want to check CPU cores",
      "help me see CPU information", "hardware processor",
      "CPU speed", "logical cores", "processor architecture"
    ],
    description: "Displays device CPU information including logical core count and hardware concurrency.",
    inputSchema: {},
    route: "/tools/cpu-info",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: {}, expectedBehavior: "Shows CPU logical core count from navigator.hardwareConcurrency and platform information", shouldFail: false },
      { input: { benchmark: false }, expectedBehavior: "With benchmark disabled, shows static CPU info without running computation test", shouldFail: false },
      { input: { benchmark: "invalid" }, expectedBehavior: "Invalid benchmark value is ignored; CPU info is displayed without running benchmark", shouldFail: true }
    ]
  },

  {
    id: "networkSpeed",
    name: "Network Speed",
    category: "device",
    categoryColor: "#6366F1",
    keywords: [
      "network speed", "internet speed", "wifi speed test",
      "how do I test my internet speed", "I want to check my connection speed",
      "help me measure download speed", "speed test",
      "Mbps test", "bandwidth test", "ping test"
    ],
    description: "Tests internet download speed, latency, and jitter against multiple endpoints.",
    inputSchema: {},
    route: "/tools/network-speed",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: false,
    testCases: [
      { input: {}, expectedBehavior: "Runs download test, measures throughput in Mbps, shows latency in ms and jitter, displays on gauge", shouldFail: false },
      { input: { endpoint: "https://custom-test-server.com" }, expectedBehavior: "Runs speed test against specified endpoint and returns results", shouldFail: false },
      { input: { endpoint: "not_a_url" }, expectedBehavior: "Invalid URL shows inline error 'Invalid endpoint URL — using default test server'", shouldFail: true }
    ]
  },

  {
    id: "ramInfo",
    name: "RAM Info",
    category: "device",
    categoryColor: "#6366F1",
    keywords: [
      "RAM info", "memory info", "RAM usage",
      "how do I check my phone RAM", "I want to see available RAM",
      "help me check device memory", "device RAM",
      "memory status", "available memory", "JS heap size"
    ],
    description: "Displays device RAM information and JavaScript heap memory usage from the Performance API.",
    inputSchema: {},
    route: "/tools/ram-info",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: {}, expectedBehavior: "Shows deviceMemory in GB from navigator API and JS heap usage from performance.memory", shouldFail: false },
      { input: { refresh: true }, expectedBehavior: "Re-reads memory APIs and updates display with latest values", shouldFail: false },
      { input: { format: "bytes" }, expectedBehavior: "Converts memory display to raw bytes instead of GB/MB formatted values", shouldFail: false }
    ]
  },

  {
    id: "batteryTest",
    name: "Battery Test",
    category: "device",
    categoryColor: "#6366F1",
    keywords: [
      "battery test", "battery health test", "battery drain test",
      "how do I test battery health", "I want to check battery performance",
      "help me stress test battery", "battery capacity test",
      "battery benchmark", "charge cycle test", "power test"
    ],
    description: "Runs a controlled battery drain and charge test to estimate battery health and capacity.",
    inputSchema: { testType: "string" },
    route: "/tools/battery-test",
    supportsMultiTool: false,
    aiFeatures: ["battery-health-analysis"],
    offlineCapable: true,
    testCases: [
      { input: { testType: "drain" }, expectedBehavior: "Monitors battery level drops over time and plots drain rate to estimate hours of usage", shouldFail: false },
      { input: { testType: "" }, expectedBehavior: "Empty test type shows test selection UI with drain, charge, and idle options", shouldFail: false },
      { input: { testType: "invalid_test" }, expectedBehavior: "Unknown test type shows inline error and presents available test options", shouldFail: true }
    ]
  },

  // ══════════════════════════════════════════════════════════
  // GAMES (5)
  // ══════════════════════════════════════════════════════════
  {
    id: "snakeGame",
    name: "Snake",
    category: "games",
    categoryColor: "#F97316",
    keywords: [
      "snake game", "snake", "classic snake",
      "how do I play snake", "I want to play the snake game",
      "help me play snake on my phone", "eat the apple game",
      "retro snake", "Nokia snake", "arcade game"
    ],
    description: "Classic Snake game with requestAnimationFrame loop, touch swipe controls, and high score tracking.",
    inputSchema: { difficulty: "string" },
    route: "/tools/snake-game",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: { difficulty: "medium" }, expectedBehavior: "Starts snake game at medium speed; snake grows on eating apple; game ends on wall or self collision", shouldFail: false },
      { input: { difficulty: "" }, expectedBehavior: "Empty difficulty defaults to medium without error", shouldFail: false },
      { input: { difficulty: "impossible_mode" }, expectedBehavior: "Unknown difficulty falls back to medium and shows 'Unknown difficulty — using Medium'", shouldFail: true }
    ]
  },

  {
    id: "ticTacToe",
    name: "Tic Tac Toe",
    category: "games",
    categoryColor: "#F97316",
    keywords: [
      "tic tac toe", "tictactoe", "noughts and crosses",
      "how do I play tic tac toe", "I want to play tic-tac-toe",
      "help me play X O game", "XO game", "noughts crosses",
      "3x3 grid game", "two player game", "AI opponent"
    ],
    description: "Tic Tac Toe with unbeatable minimax AI, three difficulty levels, and win highlighting.",
    inputSchema: { difficulty: "string" },
    route: "/tools/tic-tac-toe",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: { difficulty: "hard" }, expectedBehavior: "AI uses minimax algorithm and never loses; blocks winning moves and takes winning positions", shouldFail: false },
      { input: { difficulty: "easy" }, expectedBehavior: "AI makes random valid moves and can be beaten by optimal play", shouldFail: false },
      { input: { difficulty: 999 }, expectedBehavior: "Invalid numeric difficulty is ignored and defaults to medium", shouldFail: true }
    ]
  },

  {
    id: "memoryCard",
    name: "Memory Card",
    category: "games",
    categoryColor: "#F97316",
    keywords: [
      "memory card", "memory match", "card matching game",
      "how do I play memory card game", "I want to test my memory",
      "help me play flip card matching", "concentration game",
      "card flip game", "pair matching", "memory puzzle"
    ],
    description: "Card memory matching game with Fisher-Yates shuffle, CSS flip animations, and difficulty levels.",
    inputSchema: { difficulty: "string" },
    route: "/tools/memory-card",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: { difficulty: "medium" }, expectedBehavior: "Presents 4x4 grid of 16 face-down cards; matched pairs stay revealed; shows move count and timer", shouldFail: false },
      { input: { difficulty: "hard" }, expectedBehavior: "Presents 6x6 grid of 36 cards with shorter preview time before cards flip back", shouldFail: false },
      { input: { difficulty: "" }, expectedBehavior: "Empty difficulty defaults to easy (4x4) without error", shouldFail: false }
    ]
  },

  {
    id: "game2048",
    name: "2048",
    category: "games",
    categoryColor: "#F97316",
    keywords: [
      "2048", "2048 game", "tile merging game",
      "how do I play 2048", "I want to play 2048",
      "help me merge tiles", "number merge game",
      "sliding puzzle", "tile game", "combine numbers"
    ],
    description: "Classic 2048 sliding tile game with swipe controls, smooth CSS transitions, and best score storage.",
    inputSchema: {},
    route: "/tools/game-2048",
    supportsMultiTool: false,
    aiFeatures: [],
    offlineCapable: true,
    testCases: [
      { input: {}, expectedBehavior: "Starts 4x4 2048 grid with 2 initial tiles; merges tiles correctly on swipe/arrow key; tracks score", shouldFail: false },
      { input: { swipe: "right" }, expectedBehavior: "All tiles slide right; equal adjacent tiles merge; new tile spawns in empty cell", shouldFail: false },
      { input: { swipe: "diagonal" }, expectedBehavior: "Diagonal swipe is ignored; only cardinal directions accepted", shouldFail: true }
    ]
  },

  {
    id: "chess",
    name: "Chess",
    category: "games",
    categoryColor: "#F97316",
    keywords: [
      "chess", "chess game", "play chess",
      "how do I play chess on my phone", "I want to play chess against AI",
      "help me learn chess", "Stockfish chess",
      "chess opponent", "chess board", "chess puzzle"
    ],
    description: "Full chess game with Stockfish AI opponent, algebraic notation, move history, and difficulty levels.",
    inputSchema: { difficulty: "string" },
    route: "/tools/chess",
    supportsMultiTool: false,
    aiFeatures: ["stockfish-ai"],
    offlineCapable: true,
    testCases: [
      { input: { difficulty: "medium" }, expectedBehavior: "Renders chess board with correct piece setup; AI responds to player moves using Stockfish at depth 8", shouldFail: false },
      { input: { difficulty: "easy" }, expectedBehavior: "AI uses Stockfish at depth 1, making suboptimal moves that beginners can defeat", shouldFail: false },
      { input: { difficulty: "" }, expectedBehavior: "Empty difficulty defaults to medium without error; game starts immediately", shouldFail: false }
    ]
  }
];

// ── Registry helpers ──────────────────────────────────────────────────────────

export const CATEGORIES = [
  { id: "timeanddate", name: "Time & Date" },
  { id: "calculative", name: "Calculative" },
  { id: "tools", name: "Tools" },
  { id: "health", name: "Health" },
  { id: "text", name: "Text" },
  { id: "media", name: "Media" },
  { id: "device", name: "Device" },
  { id: "games", name: "Games" }
];

/** Get all tools in the registry. */
export function getAllTools(): ToolConfig[] {
  return toolsRegistry;
}

/** Look up a single tool by its id. Returns undefined if not found. */
export function getToolById(id: string): ToolConfig | undefined {
  return toolsRegistry.find(t => t.id === id);
}

/** Get all tools in a given category. */
export function getToolsByCategory(category: ToolCategory): ToolConfig[] {
  return toolsRegistry.filter(t => t.category === category);
}

/** Get all tools that have AI features. */
export function getAIEnabledTools(): ToolConfig[] {
  return toolsRegistry.filter(t => t.aiFeatures.length > 0);
}

/** Get all tools that support offline usage. */
export function getOfflineCapableTools(): ToolConfig[] {
  return toolsRegistry.filter(t => t.offlineCapable);
}

/** Search tools by query (matching name, description, or keywords). Case-insensitive. */
export function searchTools(query: string): ToolConfig[] {
  const lcQuery = query.toLowerCase().trim();
  if (!lcQuery) return [];
  return toolsRegistry.filter(
    t =>
      t.name.toLowerCase().includes(lcQuery) ||
      t.description.toLowerCase().includes(lcQuery) ||
      t.keywords.some(kw => kw.toLowerCase().includes(lcQuery))
  );
}

/** Validate that every tool in the registry has a non-empty id and route. */
export function validateRegistry(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const tool of toolsRegistry) {
    if (!tool.id) errors.push(`Tool missing id: ${tool.name}`);
    if (!tool.route) errors.push(`Tool ${tool.id} missing route`);
    if (seenIds.has(tool.id)) errors.push(`Duplicate tool id: ${tool.id}`);
    if (tool.keywords.length < 8) errors.push(`Tool ${tool.id} has fewer than 8 keywords (${tool.keywords.length})`);
    if (tool.testCases.length < 3) errors.push(`Tool ${tool.id} has fewer than 3 test cases`);
    seenIds.add(tool.id);
  }

  return { valid: errors.length === 0, errors };
}
