/**
 * FILE: src/lib/intentMatcher.ts
 *
 * Local pattern matcher — routes high-confidence queries without calling Gemini.
 * If local confidence >= 0.85 the router returns immediately (< 100ms).
 *
 * Architecture rule:
 *   - Normalize query: trim + collapse whitespace. Do NOT lowercase — patterns
 *     use the /i flag to handle case themselves.
 *   - Try all 29 patterns in declared order.
 *   - First pattern whose extractParams() returns non-null data wins.
 *   - Return null on no match. Never throw.
 */

// ── Result type ───────────────────────────────────────────────────────────────
export type LocalMatchResult = {
  /** Exact tool id from toolsRegistry */
  toolId: string;
  /** Extracted parameters whose keys match the tool's inputSchema */
  prefillData: Record<string, string | number | boolean>;
  /** 0–1 confidence score. Direct regex match = 0.95 */
  confidence: number;
  /** Human-readable label shown in the reasoning trace UI */
  matchedPattern: string;
};

// ── Internal pattern entry type ───────────────────────────────────────────────
interface PatternEntry {
  /** The compiled regular expression with named capture groups */
  pattern: RegExp;
  /** camelCase tool id matching toolsRegistry */
  toolId: string;
  /** Short human-readable description for reasoning trace */
  label: string;
  /**
   * Extracts prefill data from a RegExpMatchArray.
   * Returns null if the captured groups produce invalid data
   * (e.g. NaN from parseInt) — causes the matcher to skip to
   * the next pattern.
   */
  extractParams: (
    match: RegExpMatchArray
  ) => Record<string, string | number | boolean> | null;
}

// ── Helper: safe parse int / float ───────────────────────────────────────────
function safeInt(s: string | undefined): number | null {
  if (!s) return null;
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

function safeFloat(s: string | undefined): number | null {
  if (!s) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// ── 29+ named-capture-group patterns ─────────────────────────────────────────
const PATTERNS: PatternEntry[] = [

  // ── AI GUIDE EXAMPLES (High-Priority local matches) ────────────────────────
  {
    // "70 kg 175 cm BMI" / "70kg 175cm bmi"
    pattern: /^(?<weight>\d+(?:\.\d+)?)\s*(?<wUnit>kg|lbs?)\s+(?<height>\d+(?:\.\d+)?)\s*(?<hUnit>cm|m|ft|in|inch)\s+bmi$/i,
    toolId: "bmiCalculator",
    label: "ai_guide:bmi_shorthand",
    extractParams(match) {
      const weight = safeFloat(match.groups?.["weight"]);
      const height = safeFloat(match.groups?.["height"]);
      const wUnit = (match.groups?.["wUnit"] ?? "").toLowerCase();
      const hUnit = (match.groups?.["hUnit"] ?? "").toLowerCase();
      const unit = wUnit === "kg" && (hUnit === "cm" || hUnit === "m") ? "metric" : "imperial";
      if (weight === null || height === null) return null;
      return { weight, height, unit };
    }
  },
  {
    // "discount 45% of 8000" / "discount 20% on 1500"
    pattern: /^discount\s+(?<discount>\d+(?:\.\d+)?)\s*(?:%|percent)?\s+(?:of|on|for)\s+(?<price>\d+(?:\.\d+)?)$/i,
    toolId: "discountCalculator",
    label: "ai_guide:discount_of_price",
    extractParams(match) {
      const discount = safeFloat(match.groups?.["discount"]);
      const price = safeFloat(match.groups?.["price"]);
      if (discount === null || price === null) return null;
      return { originalPrice: price, discountPercent: discount };
    }
  },
  {
    // "calculate compound interest" / "calculate simple interest"
    pattern: /^calculate\s+(?<type>compound|simple)?\s*interest$/i,
    toolId: "interestCalculator",
    label: "ai_guide:interest_no_numbers",
    extractParams(match) {
      const type = (match.groups?.["type"] ?? "").toLowerCase() || "simple";
      return { principal: 10000, rate: 8, time: 5, type };
    }
  },
  {
    // "fuel efficiency 15km/l for 450km at 108 rs"
    pattern: /^fuel\s+efficiency\s+(?<mileage>\d+(?:\.\d+)?)\s*(?:km\/l|mpg)\s+for\s+(?<distance>\d+(?:\.\d+)?)\s*(?:km|miles?)\s+at\s+(?<price>\d+(?:\.\d+)?)\s*(?:rs|rupees?|inr|\$)?$/i,
    toolId: "fuelCalculator",
    label: "ai_guide:fuel_explicit",
    extractParams(match) {
      const mileage = safeFloat(match.groups?.["mileage"]);
      const distance = safeFloat(match.groups?.["distance"]);
      const price = safeFloat(match.groups?.["price"]);
      if (mileage === null || distance === null || price === null) return null;
      return { mileage, distance, price };
    }
  },
  {
    // "mutual funds return for 5000 sip"
    pattern: /^mutual\s+funds?\s+(?:return\s+)?for\s+(?<amount>\d+(?:\.\d+)?)\s+(?<type>sip|lumpsum|lump\s*sum)$/i,
    toolId: "mutualFund",
    label: "ai_guide:mutual_fund_explicit",
    extractParams(match) {
      const amount = safeFloat(match.groups?.["amount"]);
      const type = (match.groups?.["type"] ?? "").toLowerCase() === "sip" ? "sip" : "lumpsum";
      if (amount === null) return null;
      return { amount, type };
    }
  },
  {
    // "EMI for 10 lakh loan"
    pattern: /^emi\s+for\s+(?<amount>\d+(?:\.\d+)?)\s*(?<scale>lakhs?|l|cr|crores?)\s*(?:loan)?$/i,
    toolId: "emiCalculator",
    label: "ai_guide:emi_lakhs",
    extractParams(match) {
      const amount = safeFloat(match.groups?.["amount"]) || 0;
      const scale = (match.groups?.["scale"] ?? "").toLowerCase();
      let factor = 1;
      if (scale.startsWith("l")) factor = 100000;
      else if (scale.startsWith("c")) factor = 10000000;
      return { loanAmount: amount * factor };
    }
  },
  {
    // "check the age for 4th December 2004"
    pattern: /^(?:check\s+the\s+)?age\s+for\s+(?<day>\d{1,2})(?:st|nd|rd|th)?\s+(?<month>jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(?<year>\d{4})$/i,
    toolId: "ageCalculator",
    label: "ai_guide:age_verbal_date",
    extractParams(match) {
      const day = match.groups?.["day"]?.padStart(2, "0") || "01";
      const monthName = (match.groups?.["month"] || "").toLowerCase();
      const year = match.groups?.["year"] || "2000";
      const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const idx = months.findIndex(m => monthName.startsWith(m));
      const month = idx !== -1 ? String(idx + 1).padStart(2, "0") : "01";
      return { dob: `${year}-${month}-${day}` };
    }
  },
  {
    // "send whatsapp to 9876543210 with message hello"
    pattern: /^send\s+whatsapp\s+to\s+(?<phone>[+\d][\d\s\-()]{7,})\s+with\s+message\s+(?<message>.+)$/i,
    toolId: "whatsappDirect",
    label: "ai_guide:whatsapp_explicit",
    extractParams(match) {
      const phone = match.groups?.["phone"]?.trim().replace(/\s/g, "") || "";
      const message = match.groups?.["message"]?.trim() || "";
      if (!phone) return null;
      return { phoneNumber: phone, message };
    }
  },
  {
    // "shatter sunset sample"
    pattern: /^shatter\s+(?<sample>city|nature|sunset|abstract)\s+sample$/i,
    toolId: "color-picker",
    label: "ai_guide:color_picker_sample",
    extractParams(match) {
      const sample = match.groups?.["sample"]?.toLowerCase() || "sunset";
      return { sample };
    }
  },
  {
    // "check London time offset"
    pattern: /^check\s+(?<timezone>[a-zA-Z\s.-]+)\s+time\s+offset$/i,
    toolId: "timeZone",
    label: "ai_guide:timezone_offset",
    extractParams(match) {
      const tz = match.groups?.["timezone"]?.trim();
      if (!tz) return null;
      return { timezone: tz };
    }
  },
  {
    // "leap year check 2028"
    pattern: /^leap\s*year\s+check\s+(?<year>\d{3,4})$/i,
    toolId: "leapYear",
    label: "ai_guide:leap_year_check",
    extractParams(match) {
      const year = safeInt(match.groups?.["year"]);
      if (year === null || year <= 0) return null;
      return { year };
    }
  },

  // ── PDF WORD CONVERTER (3 patterns) ─────────────────────────────────────────
  {
    // "convert pdf to word" / "pdf to word" / "pdf to docx"
    pattern: /\b(?:convert\s+)?pdf\s+(?:to|into|in|2)\s+(?:word|docx?)\b/i,
    toolId: "pdfWordConverter",
    label: "pdfWordConverter:pdf_to_word",
    extractParams() {
      return {};
    }
  },
  {
    // "convert word to pdf" / "word to pdf" / "docx to pdf"
    pattern: /\b(?:convert\s+)?(?:word|docx?)\s+(?:to|into|in|2)\s+pdf\b/i,
    toolId: "pdfWordConverter",
    label: "pdfWordConverter:word_to_pdf",
    extractParams() {
      return {};
    }
  },
  {
    // "pdf converter" / "document converter" / "pdf word converter"
    pattern: /\b(?:pdf\s+word|pdf|word|document|docx?)\s+converter\b/i,
    toolId: "pdfWordConverter",
    label: "pdfWordConverter:general",
    extractParams() {
      return {};
    }
  },

  // ── TEXT SCANNER (3 patterns) ──────────────────────────────────────────────
  {
    // "extract text from image" / "scan text from document" / "extract text"
    pattern: /\b(?:extract|scan|get|copy)\s+text\s+(?:from\s+)?(?:image|photo|pic|document|file|pdf|doc|docx)?\b/i,
    toolId: "textScanner",
    label: "textScanner:extract_text",
    extractParams() {
      return {};
    }
  },
  {
    // "ocr this image" / "ocr document" / "run ocr"
    pattern: /\bocr\b/i,
    toolId: "textScanner",
    label: "textScanner:ocr",
    extractParams() {
      return {};
    }
  },
  {
    // "scan document" / "scan image" / "image text scanner"
    pattern: /\bscan\s+(?:document|image|photo|pic|file|pdf|docx?)\b/i,
    toolId: "textScanner",
    label: "textScanner:scan_doc",
    extractParams() {
      return {};
    }
  },

  // ── TRANSLATOR (5 patterns) ────────────────────────────────────────────────
  {
    // "translate hello to french" / "translate this text to Tamil"
    pattern: /(?:translate|convert|say)\s+(?<text>.+?)\s+(?:to|into|in)\s+(?<language>[a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
    toolId: "translator",
    label: "translator:text_to_language",
    extractParams(match) {
      const text = match.groups?.["text"]?.trim() || "";
      const language = match.groups?.["language"]?.trim() || "";
      if (!text || !language) return null;
      if (/^\d/.test(text)) return null; // Avoid matching number-based conversions like "convert 100 USD to INR"
      return { text, targetLanguage: language.toLowerCase() };
    }
  },
  {
    // "translate to hindi" / "open translator in french"
    pattern: /(?:translate|translator|translation)\s+(?:to|in|into)\s+(?<language>[a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
    toolId: "translator",
    label: "translator:to_language_only",
    extractParams(match) {
      const language = match.groups?.["language"]?.trim() || "";
      if (!language) return null;
      return { targetLanguage: language.toLowerCase() };
    }
  },
  {
    // "english to hindi translator" / "hindi to english"
    pattern: /(?<from>[a-zA-Z]+)\s+to\s+(?<to>[a-zA-Z]+)\s+(?:translator|translate|translation)/i,
    toolId: "translator",
    label: "translator:lang_to_lang",
    extractParams(match) {
      const from = match.groups?.["from"]?.trim() || "";
      const to = match.groups?.["to"]?.trim() || "";
      if (!from || !to) return null;
      return { sourceLang: from.toLowerCase(), targetLanguage: to.toLowerCase() };
    }
  },

  // ── WHATSAPP DIRECT (3 patterns) ──────────────────────────────────────────
  {
    // "send hi to +919876543210" / "whatsapp +919876543210 hello there"
    pattern: /(?:send|whatsapp|message|msg|text)\s+(?<message>.+?)\s+(?:to|at)\s+(?<phone>[+\d][\d\s\-()]{7,})/i,
    toolId: "whatsappDirect",
    label: "whatsapp:message_to_number",
    extractParams(match) {
      const message = match.groups?.["message"]?.trim() || "";
      const phone = match.groups?.["phone"]?.trim().replace(/\s/g, "") || "";
      if (!phone) return null;
      return { message, phoneNumber: phone };
    }
  },
  {
    // "open whatsapp with 9876543210" / "whatsapp 9876543210"
    pattern: /(?:whatsapp|open whatsapp|wa\.me)\s+(?<phone>[+\d][\d\s\-()]{7,})/i,
    toolId: "whatsappDirect",
    label: "whatsapp:open_with_number",
    extractParams(match) {
      const phone = match.groups?.["phone"]?.trim().replace(/\s/g, "") || "";
      if (!phone) return null;
      return { phoneNumber: phone };
    }
  },

  // ── COLOR PICKER (2 patterns) ─────────────────────────────────────────────
  {
    // "color picker" / "colour picker" / "palette" / "extract colors"
    pattern: /\b(?:color|colour)\s+(?:picker|extract|palette|select)|particulate|shatter\s+image\b/i,
    toolId: "color-picker",
    label: "color-picker:open",
    extractParams() {
      return {};
    }
  },
  {
    // "shatter abstract" / "load nature sample"
    pattern: /(?:shatter|load|pick)\s+(?:the\s+)?(?:sample\s+)?(city|nature|sunset|abstract)\b/i,
    toolId: "color-picker",
    label: "color-picker:sample",
    extractParams(match) {
      return { sample: match[1].toLowerCase() };
    }
  },

  // ── FLASHLIGHT (2 patterns) ───────────────────────────────────────────────
  {
    // "turn on flashlight" / "open torch" / "turn on the light"
    pattern: /(?:turn\s+on|open|start|activate|enable)\s+(?:the\s+)?(?:flashlight|torch|light|flash)/i,
    toolId: "flashlight",
    label: "flashlight:turn_on",
    extractParams() {
      return { autoStart: true };
    }
  },
  {
    // "flashlight on" / "torch on" / "light on"
    pattern: /\b(?:flashlight|torch|light|flash)\b.*?\bon\b|\bon\b.*?\b(?:flashlight|torch|light|flash)\b/i,
    toolId: "flashlight",
    label: "flashlight:on_keyword",
    extractParams() {
      return { autoStart: true };
    }
  },

  // ── AUDIO RECORDER (3 patterns) ───────────────────────────────────────────
  {
    // "record audio" / "start recording" / "record voice" / "open recorder"
    pattern: /(?:start|begin|open|launch)?\s*(?:audio|voice|sound|mic|microphone)?\s*(?:record(?:ing|er)?)/i,
    toolId: "audioRecorder",
    label: "audioRecorder:start",
    extractParams() {
      return { autoStart: true };
    }
  },
  {
    // "capture my voice" / "record my speech" / "capture sound"
    pattern: /(?:capture|record)\s+(?:my\s+)?(?:voice|speech|audio|sound|microphone|mic)/i,
    toolId: "audioRecorder",
    label: "audioRecorder:capture_voice",
    extractParams() {
      return { autoStart: true };
    }
  },

  // ── DISCOUNT CALCULATOR (2 patterns) ───────────────────────────────────────
  {
    // "45 of 567" / "45% 8000" / "25% off 100 with 5% tax"
    pattern: /(?<discount>\d+(?:\.\d+)?)\s*(?:%|percent)?\s*(?:of|off)\s*(?<price>\d+(?:\.\d+)?)(?:\s*(?:with|plus|\+)?\s*(?<tax>\d+(?:\.\d+)?)\s*(?:%|percent)?\s*tax)?/i,
    toolId: "discountCalculator",
    label: "discount:percent_of_price",
    extractParams(match) {
      const discount = safeFloat(match.groups?.["discount"]);
      const price = safeFloat(match.groups?.["price"]);
      const tax = safeFloat(match.groups?.["tax"]) || 0;
      if (discount === null || price === null) return null;
      return { originalPrice: price, discountPercent: discount, taxPercent: tax };
    }
  },
  {
    // "discount 20% on 500" / "discount 10 for 100"
    pattern: /discount\s+(?<discount>\d+(?:\.\d+)?)\s*(?:%|percent)?\s+(?:on|for)\s+(?<price>\d+(?:\.\d+)?)/i,
    toolId: "discountCalculator",
    label: "discount:explicit_on_price",
    extractParams(match) {
      const discount = safeFloat(match.groups?.["discount"]);
      const price = safeFloat(match.groups?.["price"]);
      if (discount === null || price === null) return null;
      return { originalPrice: price, discountPercent: discount };
    }
  },

  // ── PERCENTAGE CALCULATOR (4 patterns) ─────────────────────────────────────
  {
    // "20% of 500" / "15 percent of 80"
    pattern: /(?<pct>\d+(?:\.\d+)?)\s*(?:%|percent)\s+of\s+(?<val>\d+(?:\.\d+)?)/i,
    toolId: "percentageCalculator",
    label: "percentage:of_value",
    extractParams(match) {
      const pct = safeFloat(match.groups?.["pct"]);
      const val = safeFloat(match.groups?.["val"]);
      if (pct === null || val === null) return null;
      return { mode: "of", percentage: pct, value: val };
    }
  },
  {
    // "50 is what percent of 200" / "30 is what % of 150"
    pattern: /(?<x>\d+(?:\.\d+)?)\s*is\s*what\s*(?:%|percent)\s*of\s*(?<y>\d+(?:\.\d+)?)/i,
    toolId: "percentageCalculator",
    label: "percentage:is_what_percent",
    extractParams(match) {
      const x = safeFloat(match.groups?.["x"]);
      const y = safeFloat(match.groups?.["y"]);
      if (x === null || y === null || y === 0) return null;
      return { mode: "is_what", x, y };
    }
  },
  {
    // "percentage change from 100 to 120" / "change from 50 to 75"
    pattern: /(?:percentage\s+)?change\s+from\s+(?<x>\d+(?:\.\d+)?)\s+to\s+(?<y>\d+(?:\.\d+)?)/i,
    toolId: "percentageCalculator",
    label: "percentage:change_from_to",
    extractParams(match) {
      const x = safeFloat(match.groups?.["x"]);
      const y = safeFloat(match.groups?.["y"]);
      if (x === null || y === null || x === 0) return null;
      return { mode: "change", x, y };
    }
  },
  {
    // "increase 200 by 15%" / "decrease 100 by 10%"
    pattern: /(?<type>increase|decrease)\s+(?<x>\d+(?:\.\d+)?)\s*by\s*(?<y>\d+(?:\.\d+)?)\s*(?:%|percent)/i,
    toolId: "percentageCalculator",
    label: "percentage:increase_decrease",
    extractParams(match) {
      const type = (match.groups?.["type"] ?? "").toLowerCase();
      const x = safeFloat(match.groups?.["x"]);
      const y = safeFloat(match.groups?.["y"]);
      if (x === null || y === null) return null;
      // Formula matches target state:
      const targetY = type === 'increase' ? x * (1 + y / 100) : x * (1 - y / 100);
      return { mode: "change", x, y: targetY };
    }
  },

  // ── INTEREST CALCULATOR (1 pattern) ────────────────────────────────────────
  {
    // "calculate interest of 5000 at 8% for 3 years"
    pattern: /interest(?: on)?\s+(?<principal>\d+(?:\.\d+)?)(?:\s+at\s+(?<rate>\d+(?:\.\d+)?)\s*(?:%|percent)?)?(?:\s+for\s+(?<time>\d+(?:\.\d+)?)\s*years?)?/i,
    toolId: "interestCalculator",
    label: "interest:calculation",
    extractParams(match) {
      const principal = safeFloat(match.groups?.["principal"]);
      const rate = safeFloat(match.groups?.["rate"]) || 8;
      const time = safeFloat(match.groups?.["time"]) || 5;
      if (principal === null) return null;
      return { principal, rate, time };
    }
  },

  // ── FUEL CALCULATOR (1 pattern) ────────────────────────────────────────────
  {
    // "calculate trip cost for 500 km at 15 km/l and 100 per liter"
    pattern: /(?:fuel|trip\s*cost|travel\s*cost)(?:\s+(?<distance>\d+(?:\.\d+)?)\s*(?:km|miles?)?)?(?:\s+at\s+(?<mileage>\d+(?:\.\d+)?)\s*(?:km\/l|mpg)?)?(?:\s+(?:and\s+)?(?<price>\d+(?:\.\d+)?)\s*(?:price|per\s*(?:l|liter|gallon)?)?)?/i,
    toolId: "fuelCalculator",
    label: "fuel:calculation",
    extractParams(match) {
      const distance = safeFloat(match.groups?.["distance"]);
      const mileage = safeFloat(match.groups?.["mileage"]);
      const price = safeFloat(match.groups?.["price"]);
      if (distance === null && mileage === null && price === null) return null;
      return {
        ...(distance !== null ? { distance } : {}),
        ...(mileage !== null ? { mileage } : {}),
        ...(price !== null ? { price } : {})
      };
    }
  },

  // ── ELECTRICITY CALCULATOR (2 patterns) ────────────────────────────────────
  {
    // "electricity 1500 watts for 8 hours at 0.15 rate"
    pattern: /(?:electricity|current\s*bill)(?:\s+(?<watts>\d+(?:\.\d+)?)\s*watts?)?(?:\s+for\s+(?<hours>\d+(?:\.\d+)?)\s*hours?)?(?:\s+at\s+(?<rate>\d+(?:\.\d+)?)\s*(?:rate|price)?)?/i,
    toolId: "electricityCalculator",
    label: "electricity:calculation",
    extractParams(match) {
      const watts = safeFloat(match.groups?.["watts"]);
      const hours = safeFloat(match.groups?.["hours"]);
      const rate = safeFloat(match.groups?.["rate"]);
      if (watts === null && hours === null && rate === null) return null;
      return {
        ...(watts !== null ? { watts } : {}),
        ...(hours !== null ? { hours } : {}),
        ...(rate !== null ? { rate } : {})
      };
    }
  },
  {
    // "electricity cost of AC" / "current bill for Fridge"
    pattern: /(?:electricity|current\s*bill).*\b(?<device>AC|AC\s*\(1\.5T\)|Fridge|LED\s*TV|TV|Washing|Washing\s*M\/c|Laptop|Heater|Iron|Bulb)\b/i,
    toolId: "electricityCalculator",
    label: "electricity:device_preset",
    extractParams(match) {
      const device = match.groups?.["device"]?.trim();
      if (!device) return null;
      return { device };
    }
  },

  // ── MUTUAL FUNDS (1 pattern) ───────────────────────────────────────────────
  {
    // "mutual funds 5000 at 12% for 10 years" / "sip 2000 for 5 years"
    pattern: /(?:mutual\s*funds?|sip|lumpsum|lump\s*sum)(?:\s+(?<amount>\d+(?:\.\d+)?))?(?:\s+at\s+(?<rate>\d+(?:\.\d+)?)\s*(?:%|percent)?)?(?:\s+for\s+(?<years>\d+(?:\.\d+)?)\s*years?)?/i,
    toolId: "mutualFund",
    label: "mutual_fund:calculation",
    extractParams(match) {
      const amount = safeFloat(match.groups?.["amount"]);
      const rate = safeFloat(match.groups?.["rate"]);
      const years = safeFloat(match.groups?.["years"]);
      return {
        ...(amount !== null ? { amount } : {}),
        ...(rate !== null ? { rate } : {}),
        ...(years !== null ? { tenure: years } : {})
      };
    }
  },

  // ── EMI CALCULATOR (2 patterns) ────────────────────────────────────────────
  {
    // "emi 500000 at 8.5% for 15 years"
    pattern: /\bemi\b(?:\s+(?<principal>\d+(?:\.\d+)?))?(?:\s+at\s+(?<rate>\d+(?:\.\d+)?)\s*(?:%|percent)?)?(?:\s+for\s+(?<tenure>\d+(?:\.\d+)?)\s*(?:years?|months?))?/i,
    toolId: "emiCalculator",
    label: "emi:calculation_simple",
    extractParams(match) {
      const principal = safeFloat(match.groups?.["principal"]);
      const rate = safeFloat(match.groups?.["rate"]);
      const tenure = safeFloat(match.groups?.["tenure"]);
      return {
        ...(principal !== null ? { loanAmount: principal } : {}),
        ...(rate !== null ? { interestRate: rate } : {}),
        ...(tenure !== null ? { tenure } : {})
      };
    }
  },
  {
    // "estimated monthly interest 500000 at 8.5%"
    pattern: /estimated\s+monthly\s+interest(?:\s+(?<principal>\d+(?:\.\d+)?))?(?:\s+at\s+(?<rate>\d+(?:\.\d+)?)\s*(?:%|percent)?)?(?:\s+for\s+(?<tenure>\d+(?:\.\d+)?)\s*(?:years?|months?))?/i,
    toolId: "emiCalculator",
    label: "emi:calculation_formal",
    extractParams(match) {
      const principal = safeFloat(match.groups?.["principal"]);
      const rate = safeFloat(match.groups?.["rate"]);
      const tenure = safeFloat(match.groups?.["tenure"]);
      return {
        ...(principal !== null ? { loanAmount: principal } : {}),
        ...(rate !== null ? { interestRate: rate } : {}),
        ...(tenure !== null ? { tenure } : {})
      };
    }
  },

  // ── LINE & PIE CHARTS (2 patterns) ─────────────────────────────────────────
  {
    // "line chart titled Revenue with values 10,20,30,40"
    pattern: /line\s*(?:chart|graph)(?:\s+titled\s+(?<title>[a-zA-Z\s]+))?(?:\s+with\s+values?\s+(?<values>[\d\s,.-]+))?/i,
    toolId: "lineChart",
    label: "line_chart:plot",
    extractParams(match) {
      const title = match.groups?.["title"]?.trim();
      const values = match.groups?.["values"]?.trim();
      return {
        ...(title ? { title } : {}),
        ...(values ? { values } : {})
      };
    }
  },
  {
    // "pie chart titled Revenue with values 10,20,30,40"
    pattern: /pie\s*(?:chart|graph)(?:\s+titled\s+(?<title>[a-zA-Z\s]+))?(?:\s+with\s+values?\s+(?<values>[\d\s,.-]+))?/i,
    toolId: "pieChart",
    label: "pie_chart:plot",
    extractParams(match) {
      const title = match.groups?.["title"]?.trim();
      const values = match.groups?.["values"]?.trim();
      return {
        ...(title ? { title } : {}),
        ...(values ? { values } : {})
      };
    }
  },

  // ── LEVEL MEASURE (1 pattern) ──────────────────────────────────────────────
  {
    // "measure the level" / "whats the level of my device"
    pattern: /(?:measure\s+the\s+level|whats\s+the\s+level|level\s+measure)/i,
    toolId: "levelMeasure",
    label: "level:open",
    extractParams() {
      return {};
    }
  },

  // ── PEDOMETER (1 pattern) ──────────────────────────────────────────────────
  {
    // "track my steps" / "pedometer"
    pattern: /(?:track\s+my\s+steps|pedometer|calculate\s+my\s+walking|steps\s+counter)/i,
    toolId: "pedometer",
    label: "pedometer:open",
    extractParams() {
      return {};
    }
  },

  // ── WORLD TIME ZONE (3 patterns) ───────────────────────────────────────────
  {
    // "time in Chennai" / "timezone of Singapore" / "what time is it in Paris" / "current time in UK"
    pattern: /(?:what(?:'s| is) the )?(?:current )?\btime(?:zone| zone)?\b (?:in|of|at) (?<timezone>[a-zA-Z\s.-]+)/i,
    toolId: "timeZone",
    label: "timezone:city_or_country_prefix",
    extractParams(match) {
      const tz = match.groups?.["timezone"]?.trim();
      if (!tz) return null;
      return { timezone: tz };
    }
  },
  {
    // "Singapore time" / "India timezone" / "London world time"
    pattern: /(?<timezone>[a-zA-Z\s.-]+) \btime(?:zone| zone)?\b/i,
    toolId: "timeZone",
    label: "timezone:city_or_country_suffix",
    extractParams(match) {
      const tz = match.groups?.["timezone"]?.trim();
      if (!tz) return null;
      const lower = tz.toLowerCase();
      // Avoid matching clock descriptions and general question words
      const forbidden = ["exact", "analog", "analogue", "digital", "current", "classic", "dial", "number", "numerical", "led", "wall", "round", "elapsed", "lap", "race", "kitchen", "study", "pomodoro", "alarm", "countdown", "watch", "local", "system", "real", "standard", "world", "universal", "greenwich", "leap", "bissextile", "calendar", "normal", "common", "correct", "wrong", "right", "good", "bad", "what", "whats", "the", "is", "tell", "show", "check"];
      if (forbidden.includes(lower) || lower.split(/\s+/).some(w => forbidden.includes(w))) return null;
      return { timezone: tz };
    }
  },
  {
    // "check timezone" / "world clock" / "time zone converter"
    pattern: /(?:check|open|show|convert) (?:time\s*zones?|world\s*clocks?|timezones?)/i,
    toolId: "timeZone",
    label: "timezone:open_tool",
    extractParams() {
      return {};
    }
  },

  // ── LEAP YEAR (3 patterns) ─────────────────────────────────────────────────
  {
    // "is 2024 a leap year" / "check if 1900 is a leap year"
    pattern: /(?:is|check if) (?<year>\d{3,4}) (?:is )?(?:a )?leap\s*year/i,
    toolId: "leapYear",
    label: "leap_year:is_leap",
    extractParams(match) {
      const year = safeInt(match.groups?.["year"]);
      if (year === null || year <= 0) return null;
      return { year };
    }
  },
  {
    // "leap year 2028" / "check leap year 2030"
    pattern: /(?:check )?leap\s*year (?<year>\d{3,4})/i,
    toolId: "leapYear",
    label: "leap_year:year_suffix",
    extractParams(match) {
      const year = safeInt(match.groups?.["year"]);
      if (year === null || year <= 0) return null;
      return { year };
    }
  },
  {
    // "is this year a leap year" / "is current year a leap year"
    pattern: /is (?:this|the current) year (?:a )?leap\s*year/i,
    toolId: "leapYear",
    label: "leap_year:current_year",
    extractParams() {
      return { year: new Date().getFullYear() };
    }
  },

  // ── ANALOG CLOCK (2 patterns) ──────────────────────────────────────────────
  {
    // "open analog clock" / "show me the classic dial clock"
    pattern: /(?:open|show|display|classic|dial|hands|wall) analog(?:ue)?\s*clock/i,
    toolId: "analogClock",
    label: "analog_clock:open",
    extractParams() {
      return {};
    }
  },
  {
    // "analog watch" / "classic watch" / "dial watch"
    pattern: /(?:analog(?:ue)?|classic|dial) watch/i,
    toolId: "analogClock",
    label: "analog_clock:watch",
    extractParams() {
      return {};
    }
  },

  // ── DIGITAL CLOCK (2 patterns) ─────────────────────────────────────────────
  {
    // "open digital clock" / "show numerical clock" / "led clock"
    pattern: /(?:open|show|display|led|number|numerical) digital\s*clock/i,
    toolId: "digitalClock",
    label: "digital_clock:open",
    extractParams() {
      return {};
    }
  },
  {
    // "digital watch" / "led watch"
    pattern: /(?:digital|led) watch/i,
    toolId: "digitalClock",
    label: "digital_clock:watch",
    extractParams() {
      return {};
    }
  },

  // ── TIMER (4 patterns) ─────────────────────────────────────────────────────

  {
    // "set a 5 minute timer" / "set 30min timer"
    pattern: /set (?:a )?(?<minutes>\d+)\s*min(?:ute)?s? timer/i,
    toolId: "timer",
    label: "timer:minutes",
    extractParams(match) {
      const minutes = safeInt(match.groups?.["minutes"]);
      if (minutes === null || minutes <= 0) return null;
      return { duration: minutes * 60 };
    }
  },

  {
    // "2hr and 30min timer" / "1 hr 45 min timer"
    pattern: /(?<hours>\d+)\s*hr(?:s)? (?:and )?(?<minutes>\d+)\s*min(?:ute)?s? timer/i,
    toolId: "timer",
    label: "timer:hours_and_minutes",
    extractParams(match) {
      const hours   = safeInt(match.groups?.["hours"]);
      const minutes = safeInt(match.groups?.["minutes"]);
      if (hours === null || minutes === null) return null;
      const total = hours * 3600 + minutes * 60;
      if (total <= 0) return null;
      return { duration: total };
    }
  },

  {
    // "remind me in 10 minutes" / "remind me in 2 hours"
    pattern: /remind me in (?<value>\d+)\s*(?<unit>min(?:ute)?s?|hours?|hrs?)/i,
    toolId: "timer",
    label: "timer:remind_in",
    extractParams(match) {
      const value = safeInt(match.groups?.["value"]);
      const unit  = (match.groups?.["unit"] ?? "").toLowerCase();
      if (value === null || value <= 0) return null;
      const isHours = unit.startsWith("h");
      return { duration: isHours ? value * 3600 : value * 60 };
    }
  },

  {
    // "45 second timer" / "90 seconds timer"
    pattern: /(?<seconds>\d+)\s*seconds? timer/i,
    toolId: "timer",
    label: "timer:seconds",
    extractParams(match) {
      const seconds = safeInt(match.groups?.["seconds"]);
      if (seconds === null || seconds <= 0) return null;
      return { duration: seconds };
    }
  },

  // ── BMI (3 patterns) ───────────────────────────────────────────────────────

  {
    // "weight 70kg height 175cm" / "my weight is 150 lbs height 5ft"
    pattern:
      /(?:my )?weight (?:is )?(?<weight>\d+(?:\.\d+)?)\s*(?<weightUnit>kg|lbs?) (?:and )?height (?<height>\d+(?:\.\d+)?)\s*(?<heightUnit>cm|m|ft)/i,
    toolId: "bmiCalculator",
    label: "bmi:weight_height_explicit",
    extractParams(match) {
      const weight     = safeFloat(match.groups?.["weight"]);
      const height     = safeFloat(match.groups?.["height"]);
      const weightUnit = (match.groups?.["weightUnit"] ?? "kg").toLowerCase();
      const heightUnit = (match.groups?.["heightUnit"] ?? "cm").toLowerCase();
      if (weight === null || height === null) return null;
      if (weight <= 0 || height <= 0) return null;
      const unit = weightUnit === "kg" && (heightUnit === "cm" || heightUnit === "m")
        ? "metric"
        : "imperial";
      return { weight, height, unit };
    }
  },

  {
    // "bmi for 70kg 175cm" / "bmi 80 kg 180 cm"
    pattern: /bmi (?:for )?(?<weight>\d+(?:\.\d+)?)\s*kg (?<height>\d+(?:\.\d+)?)\s*cm/i,
    toolId: "bmiCalculator",
    label: "bmi:shorthand_kg_cm",
    extractParams(match) {
      const weight = safeFloat(match.groups?.["weight"]);
      const height = safeFloat(match.groups?.["height"]);
      if (weight === null || height === null) return null;
      if (weight <= 0 || height <= 0) return null;
      return { weight, height, unit: "metric" };
    }
  },

  {
    // "calculate my bmi" / "what's my bmi" / "check bmi"
    pattern: /(?:calculate|check|what(?:'s| is)) (?:my )?bmi/i,
    toolId: "bmiCalculator",
    label: "bmi:open_calculator",
    extractParams() {
      return {};
    }
  },

  // ── CURRENCY (1 pattern) ───────────────────────────────────────────────────

  {
    // "convert 100 USD to INR" / "500 rupees to dollars"
    // "100 dollars in euros" / "50 EUR as GBP"
    pattern:
      /(?:convert )?(?<amount>\d+(?:\.\d+)?)\s*(?<from>[A-Z]{3}|dollars?|euros?|rupees?|pounds?|yen|yuan) (?:to|in|as) (?<to>[A-Z]{3}|dollars?|euros?|rupees?|pounds?|yen|yuan)/i,
    toolId: "currencyConverter",
    label: "currency:convert_amount_from_to",
    extractParams(match) {
      const amount = safeFloat(match.groups?.["amount"]);
      const from   = match.groups?.["from"]?.trim() ?? "";
      const to     = match.groups?.["to"]?.trim() ?? "";
      if (amount === null || !from || !to) return null;
      // Normalise aliases → ISO codes
      const normalize = (s: string): string => {
        const lc = s.toLowerCase();
        if (lc === "dollars" || lc === "dollar") return "USD";
        if (lc === "euros"   || lc === "euro")   return "EUR";
        if (lc === "rupees"  || lc === "rupee")  return "INR";
        if (lc === "pounds"  || lc === "pound")  return "GBP";
        if (lc === "yen")                         return "JPY";
        if (lc === "yuan")                        return "CNY";
        return s.toUpperCase();
      };
      return { amount, fromCurrency: normalize(from), toCurrency: normalize(to) };
    }
  },

  // ── UNIT CONVERTER (3 patterns) ────────────────────────────────────────────

  {
    // "convert 100 km to miles" / "convert 5.5 kg to lbs"
    pattern:
      /convert (?<amount>\d+(?:\.\d+)?)\s*(?<from>[a-zA-Z]+) to (?<to>[a-zA-Z]+)/i,
    toolId: "unitConverter",
    label: "unit:convert_x_from_to",
    extractParams(match) {
      const amount = safeFloat(match.groups?.["amount"]);
      const from   = match.groups?.["from"]?.toLowerCase() ?? "";
      const to     = match.groups?.["to"]?.toLowerCase() ?? "";
      if (amount === null || !from || !to) return null;
      return { value: amount, fromUnit: from, toUnit: to };
    }
  },

  {
    // "100 km in miles" / "5 kg as lbs" / "30 celsius to fahrenheit"
    pattern:
      /(?<amount>\d+(?:\.\d+)?)\s*(?<from>km|miles?|kg|lbs?|celsius|fahrenheit|liters?|gallons?|feet|foot|inches?|meters?|yards?) (?:in|to|as) (?<to>[a-zA-Z]+)/i,
    toolId: "unitConverter",
    label: "unit:amount_from_to",
    extractParams(match) {
      const amount = safeFloat(match.groups?.["amount"]);
      const from   = match.groups?.["from"]?.toLowerCase() ?? "";
      const to     = match.groups?.["to"]?.toLowerCase() ?? "";
      if (amount === null || !from || !to) return null;
      return { value: amount, fromUnit: from, toUnit: to };
    }
  },

  {
    // "how many miles in 100 km" / "how many grams in 5 kg"
    pattern:
      /how many (?<to>[a-zA-Z]+) in (?<amount>\d+(?:\.\d+)?)\s*(?<from>[a-zA-Z]+)/i,
    toolId: "unitConverter",
    label: "unit:how_many_to_in_from",
    extractParams(match) {
      const amount = safeFloat(match.groups?.["amount"]);
      const from   = match.groups?.["from"]?.toLowerCase() ?? "";
      const to     = match.groups?.["to"]?.toLowerCase() ?? "";
      if (amount === null || !from || !to) return null;
      return { value: amount, fromUnit: from, toUnit: to };
    }
  },

  // ── TRANSLATOR (3 patterns) ────────────────────────────────────────────────

  {
    // "translate Hello to Tamil" / "translate good morning into Spanish"
    pattern: /translate (?<text>.+?) (?:to|into|in) (?<language>[a-zA-Z]+)$/i,
    toolId: "translator",
    label: "translator:translate_text_to_lang",
    extractParams(match) {
      const text     = match.groups?.["text"]?.trim() ?? "";
      const language = match.groups?.["language"]?.trim() ?? "";
      if (!text || !language) return null;
      return { text, targetLanguage: language.toLowerCase() };
    }
  },

  {
    // "how do you say thank you in French" / "what is good morning in Japanese"
    pattern:
      /(?:how do you say|what is) (?<text>.+?) in (?<language>[a-zA-Z]+)$/i,
    toolId: "translator",
    label: "translator:how_do_you_say",
    extractParams(match) {
      const text     = match.groups?.["text"]?.trim() ?? "";
      const language = match.groups?.["language"]?.trim() ?? "";
      if (!text || !language) return null;
      return { text, targetLanguage: language.toLowerCase() };
    }
  },

  {
    // "good morning in Hindi" / "I love you in Tamil"  (explicit language list)
    pattern:
      /(?<text>.+?) in (?<language>spanish|french|german|japanese|arabic|hindi|tamil|telugu|kannada|malayalam|bengali|marathi|gujarati|punjabi|urdu)$/i,
    toolId: "translator",
    label: "translator:phrase_in_language",
    extractParams(match) {
      const text     = match.groups?.["text"]?.trim() ?? "";
      const language = match.groups?.["language"]?.trim() ?? "";
      if (!text || !language) return null;
      return { text, targetLanguage: language.toLowerCase() };
    }
  },

  // ── CALCULATOR (2 patterns) ────────────────────────────────────────────────

  {
    // "what is 12 * (3 + 4)" / "calculate 15% of 200" / "solve 88/4"
    pattern:
      /(?:what is|calculate|compute|solve)\s+(?<expression>[\d\s\+\-\*\/\(\)\.%]+)/i,
    toolId: "calculator",
    label: "calculator:keyword_expression",
    extractParams(match) {
      const expression = match.groups?.["expression"]?.trim() ?? "";
      if (!expression) return null;
      return { expression };
    }
  },

  {
    // "12 + 8" / "100 * 3.5 / 2" — bare arithmetic expression
    pattern:
      /^(?<expression>\d+(?:\.\d+)?\s*[\+\-\*\/]\s*\d+(?:\.\d+)?(?:\s*[\+\-\*\/]\s*\d+(?:\.\d+)?)*)$/,
    toolId: "calculator",
    label: "calculator:bare_expression",
    extractParams(match) {
      const expression = match.groups?.["expression"]?.trim() ?? "";
      if (!expression) return null;
      return { expression };
    }
  },

  // ── QR GENERATOR (2 patterns) ──────────────────────────────────────────────

  {
    // "generate a QR code for https://example.com"
    // "create QR for my phone number"
    // "make a QR code my-text"
    pattern:
      /(?:generate|create|make) (?:a )?qr (?:code )?(?:for )?(?<content>.+)/i,
    toolId: "qrGenerator",
    label: "qr:generate_for_content",
    extractParams(match) {
      const content = match.groups?.["content"]?.trim() ?? "";
      if (!content) return null;
      return { content };
    }
  },

  {
    // "QR code for https://example.com" / "QR of my email"
    pattern: /qr (?:code )?(?:for|of|with) (?<content>.+)/i,
    toolId: "qrGenerator",
    label: "qr:code_for_content",
    extractParams(match) {
      const content = match.groups?.["content"]?.trim() ?? "";
      if (!content) return null;
      return { content };
    }
  },

  // ── PASSWORD (2 patterns) ──────────────────────────────────────────────────

  {
    // "generate a strong password"
    // "create a 20-character secure password"
    // "make a 12 digit random password"
    pattern:
      /(?:generate|create|make) (?:a )?(?:(?<length>\d+)[- ]?(?:character|char|digit)s? )?(?:strong |secure |random )?password/i,
    toolId: "passwordGenerator",
    label: "password:generate_with_length",
    extractParams(match) {
      const rawLength = match.groups?.["length"];
      const length    = rawLength ? (safeInt(rawLength) ?? 16) : 16;
      return { length, uppercase: true, numbers: true, symbols: true };
    }
  },

  {
    // "strong password with 24" / "secure password" / "random password"
    pattern: /(?:strong|secure|random) password(?: with (?<length>\d+))?/i,
    toolId: "passwordGenerator",
    label: "password:strong_password",
    extractParams(match) {
      const rawLength = match.groups?.["length"];
      const length    = rawLength ? (safeInt(rawLength) ?? 16) : 16;
      return { length, uppercase: true, numbers: true, symbols: true };
    }
  },

  // ── WEATHER (2 patterns) ───────────────────────────────────────────────────

  {
    // "what's the weather in Chennai" / "weather for Mumbai today"
    // "weather at Delhi" / "weather today in Bangalore"
    pattern:
      /(?:what(?:'s| is) the )?weather (?:in|at|for|today in) (?<location>.+)/i,
    toolId: "weather",
    label: "weather:weather_in_location",
    extractParams(match) {
      const location = match.groups?.["location"]?.trim() ?? "";
      if (!location) return null;
      return { location };
    }
  },

  {
    // "temperature in Hyderabad" / "forecast for Pune" / "will it rain in Kochi"
    pattern:
      /(?:temperature|forecast|rain|humidity|rainfall) (?:in|at|for) (?<location>.+)/i,
    toolId: "weather",
    label: "weather:condition_in_location",
    extractParams(match) {
      const location = match.groups?.["location"]?.trim() ?? "";
      if (!location) return null;
      return { location };
    }
  },



  // ── STOPWATCH / CLOCK (2 patterns) ────────────────────────────────────────

  {
    // "start stopwatch" / "open stopwatch" / "begin stopwatch" / "launch stopwatch"
    pattern: /(?:start|open|begin|launch) stopwatch/i,
    toolId: "stopwatch",
    label: "stopwatch:start",
    extractParams() {
      return { action: "start" };
    }
  },

  {
    // "what's the time" / "what is the current time" / "time now"
    pattern:
      /(?:what(?:'s| is) the )?(?:current )?time(?: now)?$/i,
    toolId: "digitalClock",
    label: "clock:current_time",
    extractParams() {
      return {};
    }
  },

  // ── NETWORK SPEED (2 patterns) ─────────────────────────────────────────────

  {
    // "check my internet speed" / "test wifi speed" / "run network test"
    // "measure my connection test"
    pattern:
      /(?:check|test|run|measure) (?:my )?(?:internet|wifi|wi-fi|network|connection) (?:speed|test)/i,
    toolId: "networkSpeed",
    label: "network:speed_test",
    extractParams() {
      return {};
    }
  },

  {
    // "how fast is my internet" / "how slow is my wifi connection"
    pattern: /how (?:fast|slow) is my (?:internet|wifi|wi-fi|connection)/i,
    toolId: "networkSpeed",
    label: "network:how_fast",
    extractParams() {
      return {};
    }
  },

  // ── HYDRATION (1 pattern) ─────────────────────────────────────────────────

  {
    // "I drank 250 ml of water" / "log 2 glasses water"
    // "add 500 ml water" / "I had 1 litre water" / "consumed 3 cups water"
    pattern:
      /(?:i (?:drank?|had|consumed)|log|add) (?<amount>\d+(?:\.\d+)?)\s*(?<unit>ml|milliliters?|liters?|litres?|l|glasses?|cups?) (?:of )?water/i,
    toolId: "hydrationPro",
    label: "hydration:log_water",
    extractParams(match) {
      const amount = safeFloat(match.groups?.["amount"]);
      const unit   = (match.groups?.["unit"] ?? "ml").toLowerCase();
      if (amount === null || amount <= 0) return null;
      // Normalise unit label
      let normUnit = unit;
      if (unit.startsWith("liter") || unit.startsWith("litre") || unit === "l") {
        normUnit = "ml";
        return { amount: amount * 1000, unit: normUnit };
      }
      return { amount, unit: normUnit };
    }
  },

  // ── NUTRITION (2 patterns) ────────────────────────────────────────────────

  {
    // "how many calories in an apple" / "calories of 2 boiled eggs"
    // "calories in chicken breast"
    pattern: /(?:how many )?calories? (?:in|of) (?<food>.+)/i,
    toolId: "nutritionExpert",
    label: "nutrition:calories_in_food",
    extractParams(match) {
      const food = match.groups?.["food"]?.trim() ?? "";
      if (!food) return null;
      return { food };
    }
  },

  {
    // "nutrition facts for banana" / "nutrition information of oats"
    // "nutrition info for dal rice"
    pattern:
      /nutrition (?:facts?|info(?:rmation)?) (?:for|of|in) (?<food>.+)/i,
    toolId: "nutritionExpert",
    label: "nutrition:facts_for_food",
    extractParams(match) {
      const food = match.groups?.["food"]?.trim() ?? "";
      if (!food) return null;
      return { food };
    }
  },

  // ── TEXT ENCRYPT (3 patterns) ──────────────────────────────────────────────
  {
    // "encrypt hello world" / "encode hello using caesar"
    pattern: /(?:encrypt|encode|cipher)(?:\s+using\s+(?<method>\w+))?\s+(?<text>.+)/i,
    toolId: "textEncrypt",
    label: "textEncrypt:encrypt_text",
    extractParams(match) {
      const text = match.groups?.["text"]?.trim() || "";
      const method = match.groups?.["method"]?.trim().toLowerCase() || "";
      if (!text) return null;
      const validMethods = ["caesar", "base64", "reverse", "morse"];
      return {
        text,
        ...(method && validMethods.includes(method) ? { method } : {})
      };
    }
  },
  {
    // "caesar cipher hello" / "morse code SOS" / "base64 encode my text"
    pattern: /(?<method>caesar|base64|morse|reverse)(?:\s+(?:cipher|code|encode|encrypt))?\s+(?<text>.+)/i,
    toolId: "textEncrypt",
    label: "textEncrypt:method_then_text",
    extractParams(match) {
      const text = match.groups?.["text"]?.trim() || "";
      const method = match.groups?.["method"]?.trim().toLowerCase() || "";
      if (!text || !method) return null;
      return { text, method };
    }
  },

  // ── TEXT TO BINARY (2 patterns) ────────────────────────────────────────────
  {
    // "convert hello to binary" / "encode world in hex" / "ascii code of hello"
    pattern: /(?:convert|encode|translate)\s+(?<text>.+?)\s+(?:to|in|into)\s+(?<format>binary|hex|base64|ascii)/i,
    toolId: "textToBinary",
    label: "textToBinary:text_to_format",
    extractParams(match) {
      const text = match.groups?.["text"]?.trim() || "";
      const format = match.groups?.["format"]?.trim().toLowerCase() || "";
      if (!text || !format) return null;
      return { text, type: format };
    }
  },
  {
    // "binary code of hello" / "hex value of hello world"
    pattern: /(?<format>binary|hex|hexadecimal|ascii)\s+(?:code|value|encoding)\s+(?:of|for)\s+(?<text>.+)/i,
    toolId: "textToBinary",
    label: "textToBinary:format_of_text",
    extractParams(match) {
      const text = match.groups?.["text"]?.trim() || "";
      const formatRaw = match.groups?.["format"]?.trim().toLowerCase() || "";
      if (!text || !formatRaw) return null;
      const format = formatRaw === "hexadecimal" ? "hex" : formatRaw;
      return { text, type: format };
    }
  },

  // ── TEXT REPEATER (2 patterns) ─────────────────────────────────────────────
  {
    // "repeat hello 20 times" / "repeat this text 5 times: hello world"
    pattern: /repeat\s+(?:this\s+(?:text|word|phrase)\s+)?(?<text>.+?)\s+(?<count>\d+)\s+times?/i,
    toolId: "textRepeater",
    label: "textRepeater:text_n_times",
    extractParams(match) {
      const text = match.groups?.["text"]?.trim() || "";
      const count = safeInt(match.groups?.["count"]);
      if (!text || count === null) return null;
      return { text, count };
    }
  },
  {
    // "repeat 10 times: hello world" / "multiply hello by 5"
    pattern: /(?:repeat\s+(?<count1>\d+)\s+times?\s*:?\s*(?<text1>.+)|multiply\s+(?<text2>.+?)\s+by\s+(?<count2>\d+))/i,
    toolId: "textRepeater",
    label: "textRepeater:n_times_text",
    extractParams(match) {
      const text = (match.groups?.["text1"] || match.groups?.["text2"])?.trim() || "";
      const countStr = match.groups?.["count1"] || match.groups?.["count2"];
      const count = safeInt(countStr);
      if (!text || count === null) return null;
      return { text, count };
    }
  },

  // ── CASH SEPARATOR (2 patterns) ────────────────────────────────────────────
  {
    // "separate 15450 cash" / "break down 5000 rupees" / "denominate 1000 usd"
    pattern: /(?:separate|break\s*down|denominate|split|count)\s+(?<amount>\d+(?:\.\d+)?)\s*(?<currency>rupees?|inr|rs\.?|dollars?|usd|\$|euros?|eur|pounds?|gbp)?\s*(?:cash|money|notes?|bills?|denomination)?/i,
    toolId: "cashSeparator",
    label: "cashSeparator:amount_to_denominations",
    extractParams(match) {
      const amount = safeFloat(match.groups?.["amount"]);
      if (amount === null || amount <= 0) return null;
      const currencyRaw = match.groups?.["currency"]?.toLowerCase() || "inr";
      const currencyMap: Record<string, string> = {
        rupee: "INR", rupees: "INR", inr: "INR", rs: "INR",
        dollar: "USD", dollars: "USD", usd: "USD",
        euro: "EUR", euros: "EUR", eur: "EUR",
        pound: "GBP", pounds: "GBP", gbp: "GBP"
      };
      const currency = currencyMap[currencyRaw] || "INR";
      return { amount, currency };
    }
  },
  {
    // "how many 500 notes in 15000" / "cash breakdown 5000"
    pattern: /(?:cash\s+breakdown|denomination\s+(?:of|for))\s+(?<amount>\d+(?:\.\d+)?)/i,
    toolId: "cashSeparator",
    label: "cashSeparator:breakdown",
    extractParams(match) {
      const amount = safeFloat(match.groups?.["amount"]);
      if (amount === null || amount <= 0) return null;
      return { amount };
    }
  },

  // ── NUTRITION EXPERT (2 patterns) ──────────────────────────────────────────
  {
    // "nutrition plan for 25 year old 70kg male" / "diet for 30yo female 60kg"
    pattern: /(?:nutrition|diet|calorie)\s+(?:plan|info|expert)\s+(?:for\s+)?(?<age>\d+)\s*(?:year|y\/o|yr)?\s*(?:old\s+)?(?<gender>male|female|man|woman|boy|girl)?(?:\s+(?<weight>\d+)\s*kg)?/i,
    toolId: "nutritionExpert",
    label: "nutritionExpert:profile",
    extractParams(match) {
      const age = safeInt(match.groups?.["age"]);
      const weight = safeFloat(match.groups?.["weight"]);
      const genderRaw = match.groups?.["gender"]?.toLowerCase() || "";
      const gender = genderRaw === "woman" || genderRaw === "female" || genderRaw === "girl" ? "female" : "male";
      if (age === null) return {};
      return {
        ...(age !== null ? { age } : {}),
        ...(weight !== null ? { weight } : {}),
        gender
      };
    }
  },

  // ── SLEEP ASSISTANT (2 patterns) ───────────────────────────────────────────
  {
    // "when should I sleep to wake up at 7am" / "bedtime for 7:00 wake up"
    pattern: /(?:when\s+(?:should\s+)?(?:i|to)\s+sleep|bedtime)\s+(?:for\s+|to\s+)?(?:wake\s+up\s+at\s+)?(?<time>\d{1,2}[:.]\d{2}(?:\s*[ap]m)?)/i,
    toolId: "sleepAssistant",
    label: "sleepAssistant:wake_time",
    extractParams(match) {
      const time = match.groups?.["time"]?.trim() || "";
      if (!time) return {};
      return { mode: "wake", time };
    }
  },
  {
    // "what time to wake up if I sleep at 10pm" / "alarm for sleeping at 11:00"
    pattern: /(?:wake\s+up|alarm)\s+(?:time\s+)?(?:if|for)\s+(?:i\s+)?sleep(?:ing)?\s+at\s+(?<time>\d{1,2}[:.]\d{2}(?:\s*[ap]m)?)/i,
    toolId: "sleepAssistant",
    label: "sleepAssistant:bed_time",
    extractParams(match) {
      const time = match.groups?.["time"]?.trim() || "";
      if (!time) return {};
      return { mode: "bed", time };
    }
  },

];

// ── Exported matcher function ────────────────────────────────────────────────

function matchHeuristics(query: string): LocalMatchResult | null {
  const qLower = query.toLowerCase();
  const hasKeywords = (kws: string[]) => kws.some(kw => qLower.includes(kw));

  // 0. TIMER SHORTCUT (Always route "timer" queries to timer tool)
  if (/\btimer\b/i.test(query)) {
    let duration = 0;
    
    const hrMatch = query.match(/(?<val>\d+)\s*(?:hr|hour)s?/i);
    const minMatch = query.match(/(?<val>\d+)\s*(?:min|minute)s?/i);
    const secMatch = query.match(/(?<val>\d+)\s*(?:sec|second)s?/i);
    
    if (hrMatch) duration += parseInt(hrMatch.groups?.val || "0", 10) * 3600;
    if (minMatch) duration += parseInt(minMatch.groups?.val || "0", 10) * 60;
    if (secMatch) duration += parseInt(secMatch.groups?.val || "0", 10);
    
    if (duration === 0) {
      const numMatch = query.match(/\btimer\s+(?:for\s+)?(?<val>\d+)\b/i);
      if (numMatch) {
        duration = parseInt(numMatch.groups?.val || "0", 10);
      }
    }
    
    return {
      toolId: "timer",
      prefillData: duration > 0 ? { duration } : {},
      confidence: 0.98,
      matchedPattern: "heuristic:timer_word"
    };
  }

  // 0a. FUEL CALCULATOR SHORTCUT
  if (hasKeywords(["fuel", "trip cost", "travel cost"])) {
    let distance: number | null = null;
    let mileage: number | null = null;
    let price: number | null = null;

    // 1. Distance: e.g. "500 km", "500km", "distance 500"
    const distMatch = query.match(/(?<val>\d+(?:\.\d+)?)\s*(?:km|miles?|kilometer|mile)/i) || query.match(/distance\s+(?<val>\d+(?:\.\d+)?)/i);
    if (distMatch) distance = parseFloat(distMatch.groups?.val || "0");

    // 2. Fuel efficiency / mileage: e.g. "5l", "5 l", "15 km/l", "15 kmpl", "efficiency 15", "mileage 15"
    const milMatch = query.match(/(?<val>\d+(?:\.\d+)?)\s*(?:km\/l|kmpl|mpg|l|liters?|efficiency)/i) || query.match(/(?:efficiency|mileage)\s+(?<val>\d+(?:\.\d+)?)/i);
    if (milMatch) mileage = parseFloat(milMatch.groups?.val || "0");

    // 3. Price of fuel: e.g. "108 rs", "108 rupees", "108rs", "$1.5", "price 108"
    const priceMatch = query.match(/(?<val>\d+(?:\.\d+)?)\s*(?:rs|rupees?|inr|\$|per\s*liter)/i) || query.match(/price\s+(?<val>\d+(?:\.\d+)?)/i);
    if (priceMatch) price = parseFloat(priceMatch.groups?.val || "0");

    // Fallback: if we didn't find specific matches, grep all numbers in query and assign sequentially: [distance, mileage, price]
    if (distance === null || mileage === null || price === null) {
      const allNums = [...query.matchAll(/\b\d+(?:\.\d+)?\b/g)].map(m => parseFloat(m[0]));
      if (allNums.length > 0) {
        if (distance === null) distance = allNums[0];
        if (allNums.length > 1 && mileage === null) mileage = allNums[1];
        if (allNums.length > 2 && price === null) price = allNums[2];
      }
    }

    return {
      toolId: "fuelCalculator",
      prefillData: {
        ...(distance !== null ? { distance } : {}),
        ...(mileage !== null ? { mileage } : {}),
        ...(price !== null ? { price } : {})
      },
      confidence: 0.98,
      matchedPattern: "heuristic:fuel_calc"
    };
  }

  // 0b. MUTUAL FUND SHORTCUT
  if (hasKeywords(["mutual fund", "sip", "lumpsum", "lump sum"])) {
    let amount: number | null = null;
    let rate: number | null = null;
    let tenure: number | null = null;
    const type = qLower.includes("lump") ? "lumpsum" : "sip";

    // 1. Amount: e.g. "5000", "rs 5000", "5000 monthly", "investment 5000"
    const amtMatch = query.match(/(?:amount|rs\.?|investment|invest)\s*(?<val>\d+(?:\.\d+)?)/i) || query.match(/\b(?<val>\d{4,9})\b/);
    if (amtMatch) amount = parseFloat(amtMatch.groups?.val || "0");

    // 2. Rate / interest: e.g. "12%", "12 percent", "rate 12", "interest 12"
    const rateMatch = query.match(/(?<val>\d+(?:\.\d+)?)\s*(?:%|percent)/i) || query.match(/(?:rate|interest|return)\s+(?<val>\d+(?:\.\d+)?)/i);
    if (rateMatch) rate = parseFloat(rateMatch.groups?.val || "0");

    // 3. Years / tenure: e.g. "10 years", "10yrs", "tenure 10"
    const yrMatch = query.match(/(?<val>\d+(?:\.\d+)?)\s*(?:years?|yrs?|tenure)/i);
    if (yrMatch) tenure = parseFloat(yrMatch.groups?.val || "0");

    // Fallback: if we have raw numbers that weren't parsed
    if (amount === null || rate === null || tenure === null) {
      const allNums = [...query.matchAll(/\b\d+(?:\.\d+)?\b/g)].map(m => parseFloat(m[0]));
      const remainingNums = allNums.filter(n => n !== amount && n !== rate && n !== tenure);
      if (remainingNums.length > 0) {
        if (amount === null && remainingNums[0] >= 100) amount = remainingNums[0];
        else if (rate === null && remainingNums[0] < 50) rate = remainingNums[0];
        else if (tenure === null && remainingNums[0] < 50) tenure = remainingNums[0];
      }
    }

    return {
      toolId: "mutualFund",
      prefillData: {
        ...(amount !== null ? { amount } : {}),
        ...(rate !== null ? { rate } : {}),
        ...(tenure !== null ? { tenure } : {}),
        type
      },
      confidence: 0.98,
      matchedPattern: "heuristic:mutual_fund"
    };
  }

  // Extract all numbers and their trailing text labels
  const numberMatches = [...query.matchAll(/(?:\$|rs\.?|rs\s*)?(?<value>\d+(?:\.\d+)?)(?:\s*(?:%|percent|kg|lbs|cm|m|feet|ft|inch|in|years|yrs|hours|hrs|watts|w|ml|liters|l|glasses|cups))?/gi)];
  const numbers = numberMatches.map(m => parseFloat(m.groups?.["value"] || "0")).filter(n => !isNaN(n));

  // 1. BMI CALCULATOR
  if (hasKeywords(["bmi", "body mass index", "weight", "height"])) {
    let weight: number | null = null;
    let height: number | null = null;
    let unit: "metric" | "imperial" = "metric";

    for (const m of numberMatches) {
      const val = parseFloat(m.groups?.["value"] || "");
      const txt = m[0].toLowerCase();
      if (isNaN(val)) continue;
      if (txt.includes("kg") || txt.includes("kilogram")) {
        weight = val;
      } else if (txt.includes("lbs") || txt.includes("pound")) {
        weight = val;
        unit = "imperial";
      } else if (txt.includes("cm") || txt.includes("centimeter")) {
        height = val;
      } else if (txt.includes("feet") || txt.includes("ft") || txt.includes("inch") || txt.includes("in")) {
        height = val;
        unit = "imperial";
      } else if (txt.includes("m") && !txt.includes("ml")) {
        height = val * 100;
      }
    }

    if (weight === null || height === null) {
      if (numbers.length >= 2) {
        const sorted = [...numbers].sort((a, b) => a - b);
        weight = sorted[0];
        height = sorted[1];
      } else if (numbers.length === 1) {
        if (numbers[0] > 120) height = numbers[0];
        else weight = numbers[0];
      }
    }

    return {
      toolId: "bmiCalculator",
      prefillData: {
        ...(weight !== null ? { weight } : {}),
        ...(height !== null ? { height } : {}),
        unit
      },
      confidence: 0.95,
      matchedPattern: "heuristic:bmi"
    };
  }

  // 2. AGE CALCULATOR
  if (hasKeywords(["age", "how old", "dob", "birthday", "born"])) {
    const dateRegexes = [
      /\b(?<year>\d{4})[-/.](?<month>\d{1,2})[-/.](?<day>\d{1,2})\b/,
      /\b(?<day>\d{1,2})[-/.](?<month>\d{1,2})[-/.](?<year>\d{4})\b/,
      /\b(?<month>jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(?<day>\d{1,2})(?:st|nd|rd|th)?(?:,)?\s+(?<year>\d{4})\b/i,
      /\b(?<day>\d{1,2})\s+(?<month>jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:,)?\s+(?<year>\d{4})\b/i,
      /\bborn\s+(?:in\s+)?(?<year>\d{4})\b/i
    ];

    let dob = "";
    for (const r of dateRegexes) {
      const m = qLower.match(r);
      if (m && m.groups) {
        const year = m.groups["year"];
        const monthRaw = m.groups["month"];
        const day = m.groups["day"] || "01";

        if (year) {
          let month = monthRaw;
          if (monthRaw && isNaN(parseInt(monthRaw))) {
            const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
            const idx = months.findIndex(mon => monthRaw.startsWith(mon));
            month = idx !== -1 ? String(idx + 1).padStart(2, "0") : "01";
          } else if (monthRaw) {
            month = monthRaw.padStart(2, "0");
          } else {
            month = "01";
          }
          dob = `${year}-${month}-${day.padStart(2, "0")}`;
          break;
        }
      }
    }

    if (dob) {
      return {
        toolId: "ageCalculator",
        prefillData: { dob },
        confidence: 0.95,
        matchedPattern: "heuristic:age"
      };
    }
  }

  // 3. DISCOUNT CALCULATOR
  if (hasKeywords(["discount", "off", "sale", "price cut"])) {
    let originalPrice: number | null = null;
    let discountPercent: number | null = null;

    for (const m of numberMatches) {
      const val = parseFloat(m.groups?.["value"] || "");
      const txt = m[0].toLowerCase();
      if (isNaN(val)) continue;
      if (txt.includes("%") || txt.includes("percent") || txt.includes("off")) {
        discountPercent = val;
      } else {
        originalPrice = val;
      }
    }

    if (originalPrice === null || discountPercent === null) {
      if (numbers.length >= 2) {
        const sorted = [...numbers].sort((a, b) => a - b);
        discountPercent = sorted[0];
        originalPrice = sorted[1];
      } else if (numbers.length === 1) {
        if (numbers[0] <= 100) discountPercent = numbers[0];
        else originalPrice = numbers[0];
      }
    }

    return {
      toolId: "discountCalculator",
      prefillData: {
        ...(originalPrice !== null ? { originalPrice } : {}),
        ...(discountPercent !== null ? { discountPercent } : {})
      },
      confidence: 0.95,
      matchedPattern: "heuristic:discount"
    };
  }

  // 4. PERCENTAGE CALCULATOR
  if (hasKeywords(["percent", "%", "percentage"])) {
    let value: number | null = null;
    let percentage: number | null = null;

    const ofMatch = qLower.match(/(?<pct>\d+(?:\.\d+)?)\s*(?:%|percent)\s*(?:of)?\s*(?<val>\d+(?:\.\d+)?)/);
    if (ofMatch && ofMatch.groups) {
      percentage = parseFloat(ofMatch.groups["pct"]);
      value = parseFloat(ofMatch.groups["val"]);
    } else {
      for (const m of numberMatches) {
        const val = parseFloat(m.groups?.["value"] || "");
        const txt = m[0].toLowerCase();
        if (isNaN(val)) continue;
        if (txt.includes("%") || txt.includes("percent")) {
          percentage = val;
        } else {
          value = val;
        }
      }
    }

    if (percentage !== null || value !== null) {
      return {
        toolId: "percentageCalculator",
        prefillData: {
          ...(percentage !== null ? { percentage } : {}),
          ...(value !== null ? { value } : {})
        },
        confidence: 0.95,
        matchedPattern: "heuristic:percentage"
      };
    }
  }

  // 5. EMI CALCULATOR
  if (hasKeywords(["emi", "loan", "mortgage"])) {
    let loanAmount: number | null = null;
    let interestRate: number | null = null;
    let tenure: number | null = null;

    for (const m of numberMatches) {
      const val = parseFloat(m.groups?.["value"] || "");
      const txt = m[0].toLowerCase();
      if (isNaN(val)) continue;

      if (txt.includes("%") || txt.includes("percent") || txt.includes("rate") || (val > 0 && val < 25 && !txt.includes("year") && !txt.includes("month"))) {
        interestRate = val;
      } else if (txt.includes("year") || txt.includes("yr") || txt.includes("tenure") || txt.includes("duration")) {
        tenure = val;
      } else if (txt.includes("month") || txt.includes("mth")) {
        tenure = val / 12;
      } else if (val > 1000) {
        loanAmount = val;
      }
    }

    if (loanAmount === null || interestRate === null || tenure === null) {
      const sorted = [...numbers].sort((a, b) => a - b);
      if (sorted.length >= 3) {
        tenure = sorted[0];
        interestRate = sorted[1];
        loanAmount = sorted[2];
      } else if (sorted.length === 2) {
        loanAmount = sorted[1];
        if (sorted[0] < 5) tenure = sorted[0];
        else interestRate = sorted[0];
      }
    }

    return {
      toolId: "emiCalculator",
      prefillData: {
        ...(loanAmount !== null ? { loanAmount } : {}),
        ...(interestRate !== null ? { interestRate } : {}),
        ...(tenure !== null ? { tenure } : {})
      },
      confidence: 0.95,
      matchedPattern: "heuristic:emi"
    };
  }

  // 6. INTEREST CALCULATOR
  if (hasKeywords(["interest", "principal", "simple interest", "compound interest"])) {
    let principal: number | null = null;
    let rate: number | null = null;
    let time: number | null = null;
    let type: "simple" | "compound" = qLower.includes("compound") ? "compound" : "simple";

    for (const m of numberMatches) {
      const val = parseFloat(m.groups?.["value"] || "");
      const txt = m[0].toLowerCase();
      if (isNaN(val)) continue;

      if (txt.includes("%") || txt.includes("percent") || txt.includes("rate") || (val > 0 && val < 25 && !txt.includes("year") && !txt.includes("month"))) {
        rate = val;
      } else if (txt.includes("year") || txt.includes("yr") || txt.includes("time") || txt.includes("period")) {
        time = val;
      } else if (txt.includes("month") || txt.includes("mth")) {
        time = val / 12;
      } else if (val > 25) {
        principal = val;
      }
    }

    if (principal === null || rate === null || time === null) {
      const sorted = [...numbers].sort((a, b) => a - b);
      if (sorted.length >= 3) {
        time = sorted[0];
        rate = sorted[1];
        principal = sorted[2];
      }
    }

    return {
      toolId: "interestCalculator",
      prefillData: {
        ...(principal !== null ? { principal } : {}),
        ...(rate !== null ? { rate } : {}),
        ...(time !== null ? { time } : {}),
        type
      },
      confidence: 0.95,
      matchedPattern: "heuristic:interest"
    };
  }

  // 7. FUEL CALCULATOR
  if (hasKeywords(["fuel", "efficiency", "mileage", "trip cost", "gas cost"])) {
    let distance: number | null = null;
    let fuelEfficiency: number | null = null;
    let fuelPrice: number | null = null;

    for (const m of numberMatches) {
      const val = parseFloat(m.groups?.["value"] || "");
      const txt = m[0].toLowerCase();
      if (isNaN(val)) continue;

      if (txt.includes("km") || txt.includes("mile") || txt.includes("distance") || txt.includes("dist")) {
        distance = val;
      } else if (txt.includes("mpg") || txt.includes("km/l") || txt.includes("kml") || txt.includes("efficiency") || txt.includes("mileage")) {
        fuelEfficiency = val;
      } else if (txt.includes("price") || txt.includes("cost") || txt.includes("rs") || txt.includes("$")) {
        fuelPrice = val;
      }
    }

    if (distance === null || fuelEfficiency === null || fuelPrice === null) {
      const sorted = [...numbers].sort((a, b) => a - b);
      if (sorted.length >= 3) {
        fuelEfficiency = sorted[1];
        fuelPrice = sorted[0];
        distance = sorted[2];
      }
    }

    return {
      toolId: "fuelCalculator",
      prefillData: {
        ...(distance !== null ? { distance } : {}),
        ...(fuelEfficiency !== null ? { fuelEfficiency } : {}),
        ...(fuelPrice !== null ? { fuelPrice } : {})
      },
      confidence: 0.95,
      matchedPattern: "heuristic:fuel"
    };
  }

  // 8. ELECTRICITY CALCULATOR
  if (hasKeywords(["electricity", "watts", "power cost", "appliance cost"])) {
    let watts: number | null = null;
    let hours: number | null = null;
    let rate: number | null = null;

    for (const m of numberMatches) {
      const val = parseFloat(m.groups?.["value"] || "");
      const txt = m[0].toLowerCase();
      if (isNaN(val)) continue;

      if (txt.includes("w") || txt.includes("watt") || txt.includes("power") || val > 100) {
        watts = val;
      } else if (txt.includes("hour") || txt.includes("hr") || txt.includes("h") || txt.includes("day") || (val > 0 && val <= 24)) {
        hours = val;
      } else if (txt.includes("rate") || txt.includes("price") || txt.includes("cost") || val < 1) {
        rate = val;
      }
    }

    if (watts === null || hours === null || rate === null) {
      const sorted = [...numbers].sort((a, b) => a - b);
      if (sorted.length >= 3) {
        rate = sorted[0];
        hours = sorted[1];
        watts = sorted[2];
      }
    }

    return {
      toolId: "electricityCalculator",
      prefillData: {
        ...(watts !== null ? { watts } : {}),
        ...(hours !== null ? { hours } : {}),
        ...(rate !== null ? { rate } : {})
      },
      confidence: 0.95,
      matchedPattern: "heuristic:electricity"
    };
  }

  // 9. CURRENCY CONVERTER
  if (hasKeywords(["convert", "currency", "exchange", "dollars", "rupees", "euros", "pounds", "yen", "usd", "inr", "eur", "gbp", "jpy"])) {
    const currencyMap: Record<string, string> = {
      usd: "USD", dollar: "USD", dollars: "USD",
      inr: "INR", rupee: "INR", rupees: "INR", rs: "INR",
      eur: "EUR", euro: "EUR", euros: "EUR",
      gbp: "GBP", pound: "GBP", pounds: "GBP",
      jpy: "JPY", yen: "JPY",
      aed: "AED", dirham: "AED", dirhams: "AED",
      aud: "AUD", cad: "CAD", sgd: "SGD", chf: "CHF", cny: "CNY", yuan: "CNY"
    };

    const words = qLower.split(/[^a-z]/);
    let fromCurrency = "USD";
    let toCurrency = "INR";
    let foundCurrencies: string[] = [];

    for (const w of words) {
      if (currencyMap[w]) {
        foundCurrencies.push(currencyMap[w]);
      }
    }

    if (foundCurrencies.length >= 2) {
      fromCurrency = foundCurrencies[0];
      toCurrency = foundCurrencies[1];
    } else if (foundCurrencies.length === 1) {
      const toIndex = qLower.indexOf("to ");
      const inIndex = qLower.indexOf("in ");
      const asIndex = qLower.indexOf("as ");
      const activeIndex = Math.max(toIndex, inIndex, asIndex);
      if (activeIndex !== -1) {
        toCurrency = foundCurrencies[0];
        fromCurrency = "USD";
      } else {
        fromCurrency = foundCurrencies[0];
        toCurrency = "INR";
      }
    }

    if (fromCurrency === toCurrency) {
      if (fromCurrency === "USD") toCurrency = "INR";
      else toCurrency = "USD";
    }

    const amount = numbers.length > 0 ? numbers[0] : 1;

    return {
      toolId: "currencyConverter",
      prefillData: {
        amount,
        fromCurrency,
        toCurrency
      },
      confidence: 0.95,
      matchedPattern: "heuristic:currency"
    };
  }

  // 10. WATER TRACKER
  if (hasKeywords(["water", "hydration", "drink", "drank", "had water"])) {
    let goal = 2500;
    for (const m of numberMatches) {
      const val = parseFloat(m.groups?.["value"] || "");
      const txt = m[0].toLowerCase();
      if (isNaN(val)) continue;
      if (txt.includes("ml")) {
        goal = val;
      } else if (txt.includes("liter") || txt.includes("litre") || txt.includes("l")) {
        goal = val * 1000;
      } else if (val > 100) {
        goal = val;
      }
    }

    return {
      toolId: "hydrationPro",
      prefillData: { goal },
      confidence: 0.95,
      matchedPattern: "heuristic:water"
    };
  }

  // 11. CASH SEPARATOR
  if (hasKeywords(["cash", "denomination", "count", "separate cash"])) {
    const amount = numbers.length > 0 ? numbers[0] : 0;
    if (amount > 0) {
      return {
        toolId: "cashSeparator",
        prefillData: { amount },
        confidence: 0.95,
        matchedPattern: "heuristic:cash"
      };
    }
  }

  // 12. TEXT REPEATER
  if (hasKeywords(["repeat", "multiplier"])) {
    let count = 10;
    for (const n of numbers) {
      if (n > 0 && n < 1000) {
        count = n;
        break;
      }
    }

    let text = "Mady";
    const quoteMatches = query.match(/["'](?<text>[^"']+)["']/);
    if (quoteMatches && quoteMatches.groups) {
      text = quoteMatches.groups["text"];
    } else {
      const words = query.split(/\s+/);
      const repeatIdx = words.findIndex(w => w.toLowerCase() === "repeat");
      if (repeatIdx !== -1 && repeatIdx < words.length - 1) {
        text = words.slice(repeatIdx + 1).join(" ").replace(/\b\d+\b/g, "").trim();
      }
    }

    return {
      toolId: "textRepeater",
      prefillData: { text, count, separator: " " },
      confidence: 0.95,
      matchedPattern: "heuristic:repeat"
    };
  }

  // 13. TIMER
  if (hasKeywords(["timer", "countdown", "remind me in"])) {
    let duration = 600;
    for (const m of numberMatches) {
      const val = parseFloat(m.groups?.["value"] || "");
      const txt = m[0].toLowerCase();
      if (isNaN(val)) continue;
      if (txt.includes("min")) {
        duration = val * 60;
      } else if (txt.includes("sec")) {
        duration = val;
      } else if (txt.includes("hour") || txt.includes("hr")) {
        duration = val * 3600;
      } else if (val > 0) {
        duration = val * 60;
      }
    }

    return {
      toolId: "timer",
      prefillData: { duration },
      confidence: 0.95,
      matchedPattern: "heuristic:timer"
    };
  }

  // 14. TRANSLATOR HEURISTIC
  if (hasKeywords(["translate", "translation", "translator", "convert text", "say in", "say it in"])) {
    // Extract language name from common patterns
    const langPatterns = [
      /(?:to|into|in)\s+(?<lang>[a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s*(?:language|lang)?/i,
      /(?<lang>[a-zA-Z]+)\s+language/i
    ];
    let targetLanguage = "";
    for (const r of langPatterns) {
      const m = query.match(r);
      if (m?.groups?.["lang"]) {
        targetLanguage = m.groups["lang"].trim();
        break;
      }
    }

    // Extract text after "translate" keyword
    const textMatch = query.match(/(?:translate|say)\s+["']?(?<text>[^"']+?)["']?\s+(?:to|in|into)/i);
    const textVal = textMatch?.groups?.["text"]?.trim() || "";

    return {
      toolId: "translator",
      prefillData: {
        ...(textVal ? { text: textVal } : {}),
        ...(targetLanguage ? { targetLanguage } : {})
      },
      confidence: 0.95,
      matchedPattern: "heuristic:translator"
    };
  }

  // 15. SIMPLE KEYWORD MATCHES
  const simpleKeywordsMap: Record<string, string> = {
    // Clocks and timers
    "analog clock": "analogClock",
    "analog watch": "analogClock",
    "digital clock": "digitalClock",
    "digital watch": "digitalClock",
    "stopwatch": "stopwatch",
    "timer": "timer",
    "leap year": "leapYear",
    "time zone": "timeZone",
    "timezone": "timeZone",
    "world clock": "timeZone",
    
    // Calculators
    "calculator": "calculator",
    "calc": "calculator",
    "discount": "discountCalculator",
    "percentage": "percentageCalculator",
    "percent": "percentageCalculator",
    "interest": "interestCalculator",
    "fuel": "fuelCalculator",
    "electricity": "electricityCalculator",
    "mutual fund": "mutualFund",
    "sip calculator": "sip",
    "sip": "mutualFund",
    "lumpsum": "mutualFund",
    "emi calculator": "emiCalculator",
    "emi": "emiCalculator",
    "bmi": "bmiCalculator",
    "body mass index": "bmiCalculator",
    "age": "ageCalculator",
    "todo": "todoList",
    "tasks": "todoList",
    
    // Weather
    "weather": "weather",
    "forecast": "weather",
    "temp": "weather",
    "temperature": "weather",

    // Text & document tools
    "translator": "translator",
    "translate": "translator",
    "translation": "translator",
    "pdf to word": "pdfWordConverter",
    "word to pdf": "pdfWordConverter",
    "docx to pdf": "pdfWordConverter",
    "doc to pdf": "pdfWordConverter",
    "pdf to docx": "pdfWordConverter",
    "pdf converter": "pdfWordConverter",
    "document converter": "pdfWordConverter",
    "pdf": "pdfCreator",
    "text scanner": "textScanner",
    "scan text": "textScanner",
    "ocr": "textScanner",
    "scan document": "textScanner",
    "scan image": "textScanner",
    "image to text": "textScanner",
    "scan": "textScanner",
    "encrypt": "textEncrypt",
    "decrypt": "textEncrypt",
    "binary": "textToBinary",
    "password": "passwordGenerator",
    "type test": "typeTester",
    "typing": "typeTester",
    "typing speed": "typeTester",

    // Media & hardware
    "compress": "imageCompressor",
    "vision": "visionStudio",
    "object detection": "visionStudio",
    "detect objects": "visionStudio",
    "draw": "dreamFlow",
    "paint": "dreamFlow",
    "sketchpad": "dreamFlow",
    "record audio": "audioRecorder",
    "voice recorder": "audioRecorder",
    "audio recorder": "audioRecorder",
    "mic record": "audioRecorder",
    "voice note": "audioRecorder",
    "record voice": "audioRecorder",
    "start recording": "audioRecorder",
    "record sound": "audioRecorder",
    "record": "audioRecorder",
    "whatsapp": "whatsappDirect",
    "wa message": "whatsappDirect",
    "send whatsapp": "whatsappDirect",
    "color picker": "color-picker",
    "colour picker": "color-picker",
    "particulate": "color-picker",
    "flashlight": "flashlight",
    "torch": "flashlight",
    "turn on light": "flashlight",
    "phone light": "flashlight",
    "mobile light": "flashlight",
    
    // Sensors & Info
    "compass": "compass",
    "noise detector": "noiseDetector",
    "decibel meter": "noiseDetector",
    "noise": "noiseDetector",
    "decibel": "noiseDetector",
    "metal detector": "metalDetector",
    "find metal": "metalDetector",
    "metal": "metalDetector",
    "battery": "battery",
    "device": "deviceInfo",
    "sensor": "sensorInfo",
    "storage": "storage",
    "disk": "storage",
    "speaker": "speakerCleaner",
    "cpu": "cpuInfo",
    "speed test": "networkSpeed",
    "internet": "networkSpeed",
    "ram": "ramInfo",

    // Games
    "snake": "snakeGame",
    "tic tac toe": "ticTacToe",
    "memory card": "memoryCard",
    "2048": "game2048",
    "chess": "chess",
    "reaction": "brainReaction",
    
    // Charts
    "pie chart": "pieChart",
    "pie graph": "pieChart",
    "line chart": "lineChart",
    "line graph": "lineChart",
    "area chart": "areaChart",
    "area graph": "areaChart",
    "graph": "lineChart",
    "chart": "lineChart",

    // Other tools
    "water tracker": "hydrationPro",
    "hydration": "hydrationPro",
    "water": "hydrationPro",
    "drink water": "hydrationPro",
    "level measure": "levelMeasure",
    "bubble level": "levelMeasure",
    "level finder": "levelMeasure",
    "thermometer": "thermometer",
    "room temperature": "thermometer",
    "body temperature": "thermometer",
    "pedometer": "pedometer",
    "step counter": "pedometer",
    "steps": "pedometer",
    "walk tracker": "pedometer",

    // Text encrypt aliases
    "text encrypt": "textEncrypt",
    "text encryption": "textEncrypt",
    "cipher text": "textEncrypt",
    "cipher": "textEncrypt",
    "caesar cipher": "textEncrypt",
    "caesar": "textEncrypt",
    "base64": "textEncrypt",
    "morse code": "textEncrypt",
    "morse": "textEncrypt",
    "text cipher": "textEncrypt",
    "encryption tool": "textEncrypt",
    "decrypt text": "textEncrypt",
    "encode text": "textEncrypt",

    // Text to binary aliases
    "text to binary": "textToBinary",
    "text converter": "textToBinary",
    "text to hex": "textToBinary",
    "text to ascii": "textToBinary",
    "text to base64": "textToBinary",
    "hex converter": "textToBinary",
    "ascii converter": "textToBinary",
    "binary converter": "textToBinary",
    "hexadecimal": "textToBinary",

    // Text repeater aliases
    "text repeater": "textRepeater",
    "repeat text": "textRepeater",
    "text multiplier": "textRepeater",
    "repeater": "textRepeater",
    "text repeat": "textRepeater",
    "multiply text": "textRepeater",

    // Cash separator aliases  
    "cash separator": "cashSeparator",
    "cash breakdown": "cashSeparator",
    "denomination": "cashSeparator",
    "denominations": "cashSeparator",
    "currency denomination": "cashSeparator",
    "money breakdown": "cashSeparator",
    "notes and coins": "cashSeparator",
    "break down cash": "cashSeparator",
    "cash calculator": "cashSeparator",

    // QR Generator aliases
    "qr": "qrGenerator",
    "qr code": "qrGenerator",
    "qr generator": "qrGenerator",
    "qr creator": "qrGenerator",
    "generate qr": "qrGenerator",
    "create qr": "qrGenerator",
    "make qr": "qrGenerator",
    "scan qr": "qrScanner",
    "qr scanner": "qrScanner",
    "read qr": "qrScanner",

    // Nutrition expert aliases
    "nutrition": "nutritionExpert",
    "nutrition expert": "nutritionExpert",
    "calorie calculator": "nutritionExpert",
    "calorie plan": "nutritionExpert",
    "daily calories": "nutritionExpert",
    "diet plan": "nutritionExpert",
    "bmi and nutrition": "nutritionExpert",
    "macros": "nutritionExpert",
    "macronutrient": "nutritionExpert",
    "calorie intake": "nutritionExpert",
    "bmr": "nutritionExpert",
    "tdee": "nutritionExpert",

    // Sleep assistant aliases
    "sleep": "sleepAssistant",
    "sleep assistant": "sleepAssistant",
    "sleep calculator": "sleepAssistant",
    "sleep tracker": "sleepAssistant",
    "bedtime": "sleepAssistant",
    "wake up time": "sleepAssistant",
    "sleep cycle": "sleepAssistant",
    "sleep journal": "sleepAssistant",

    // Todo aliases
    "todo list": "todoList",
    "to do": "todoList",
    "to do list": "todoList",
    "task list": "todoList",
    "add task": "todoList",
    "task manager": "todoList",
    "my tasks": "todoList",

    // Password generator aliases
    "password generator": "passwordGenerator",
    "generate password": "passwordGenerator",
    "create password": "passwordGenerator",
    "random password": "passwordGenerator",
    "secure password": "passwordGenerator",
    "strong password": "passwordGenerator",

    // Dice roller aliases
    "dice roller": "diceRoller",
    "roll dice": "diceRoller",
    "dice": "diceRoller",
    "roll a die": "diceRoller",
    "random dice": "diceRoller",
  };

  // Sort keys by length descending to ensure longer specific matches take precedence
  const sortedKeywords = Object.keys(simpleKeywordsMap).sort((a, b) => b.length - a.length);

  for (const kw of sortedKeywords) {
    if (qLower.includes(kw)) {
      return {
        toolId: simpleKeywordsMap[kw],
        prefillData: {},
        confidence: 0.9,
        matchedPattern: `heuristic:keyword:${kw}`
      };
    }
  }

  return null;
}

/**
 * Attempts to match a user query against all 29 local patterns.
 *
 * @param query  Raw user input string.
 * @returns A LocalMatchResult with confidence >= 0.95, or null if no match.
 *
 * Execution cost: < 2ms for any query (pure RegExp, no I/O).
 */
export function matchLocalIntent(query: string): LocalMatchResult | null {
  // Normalise: trim and collapse internal whitespace
  const normalised = query.trim().replace(/\s+/g, " ");

  for (const entry of PATTERNS) {
    const match = normalised.match(entry.pattern);
    if (!match) continue;

    // Guard: extractParams may return null for structurally invalid captures
    let prefillData: Record<string, string | number | boolean>;
    try {
      const result = entry.extractParams(match);
      if (result === null) continue;
      prefillData = result;
    } catch {
      // extractParams must never throw — skip this pattern if it does
      continue;
    }

    return {
      toolId: entry.toolId,
      prefillData,
      confidence: 0.95,
      matchedPattern: entry.label
    };
  }

  // Fallback to our upgraded smart heuristic matching
  return matchHeuristics(normalised);
}

/**
 * Returns the full list of patterns for use in testing or diagnostics.
 * Exposed for Phase 13 test suite.
 */
export function getPatterns(): ReadonlyArray<Readonly<PatternEntry>> {
  return PATTERNS;
}

// Backwards compatibility / testing aliases
export { matchLocalIntent as matchIntent };
export type IntentResult = LocalMatchResult;
