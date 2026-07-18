import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error("Neural Registry Error: VITE_GEMINI_API_KEY is not defined inside the active .env context.");
}

// Instantiate the browser-safe client instance node cleanly
const genAI = new GoogleGenerativeAI(apiKey || '');

export interface AIResponsePayload {
  action: 'NAVIGATE' | 'CHAT';
  route: string | null;
  message: string;
  params: {
    weight?: number | null;
    height?: number | null;
    sourceAmount?: number | null;
    sourceCurrency?: string | null;
    targetCurrency?: string | null;
    targetLocation?: string | null;
    [key: string]: any;
  };
}

export async function parseUserIntent(userPrompt: string): Promise<AIResponsePayload> {
  const systemInstruction = `
    You are 'Mady', the primary agentic coordinator engine for Madan's Toolkit multi-utility system.
    Your absolute objective is to analyze a messy user query and map it directly to a system route.
    You must output a single, flat JSON block. Do not include markdown wraps or block ticks (\`\`\`json).

    Route Map Registries:
    - Intent: BMI, height, weight, body health, fitness calculation -> Match Route: "/tools/bmi-calculator"
    - Intent: Currency conversion, live exchange rates, forex metrics -> Match Route: "/tools/currency-converter"
    - Intent: Time zones, live country clocks, international offsets, time in a city -> Match Route: "/tools/time_zone"
    - Intent: OCR page scanning, character extraction, document text converter -> Match Route: "/tools/text-scanner"
    - Intent: Audio voice recording, catch mic sound, speech capture -> Match Route: "/tools/audio-recorder"
    - Intent: General greetings, casual queries, jokes, conversation -> Match Route: "CHAT"

    Strict JSON Formats to output (choose one):
    1. For Navigation to BMI Calculator:
       { "action": "NAVIGATE", "route": "/tools/bmi-calculator", "message": "Launching specified metric infrastructure module...", "params": { "weight": 72, "height": 170 } }
    
    2. For Navigation to Currency Converter:
       { "action": "NAVIGATE", "route": "/tools/currency-converter", "message": "Fetching live global forex exchange rates...", "params": { "sourceAmount": 250, "sourceCurrency": "USD", "targetCurrency": "INR" } }

    3. For Navigation to World Time Dashboard (CRITICAL URL MATCH):
       { "action": "NAVIGATE", "route": "/tools/time_zone", "message": "Synchronizing global atomic clock arrays...", "params": { "targetLocation": "New York" } }

    4. For Conversations / General Chat:
       { "action": "CHAT", "route": null, "message": "Your helpful, clean conversational response text here.", "params": {} }

    CRITICAL VALUES EXTRACTION MANDATE:
    - Always extract numbers, heights, weights, or numeric value totals and attach them to relevant fields.
    - For Currency: Always convert natural language words/slang into standardized uppercase 3-letter ISO currency codes inside the params block.
    - For World Time: Extract the specific location word mentioned (e.g., "London", "New York", "Chicago", "Tokyo", "UK", "USA", "NYC") and assign it directly to the "targetLocation" key inside params.
  `;

  try {
    // Access the standard target text generation model natively
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    // Run execution with instructions clearly integrated into the structural prompt bundle
    const combinedPromptPayload = `${systemInstruction}\n\nUser Query: "${userPrompt}"`;
    const responseResult = await model.generateContent(combinedPromptPayload);
    const responseText = responseResult.response.text();

    const rawText = responseText.trim();
    
    // Clean up potential markdown wrapper tokens cleanly
    const sanitizedJsonString = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/```$/, '')
      .trim();

    const parsedData: AIResponsePayload = JSON.parse(sanitizedJsonString);
    return parsedData;
  } catch (error) {
    console.error("Orchestration processing failure node hit:", error);
    return {
      action: 'CHAT',
      route: null,
      message: "I encountered a routing variance processing your command sequence. Please re-state prompt parameters.",
      params: {}
    };
  }
}