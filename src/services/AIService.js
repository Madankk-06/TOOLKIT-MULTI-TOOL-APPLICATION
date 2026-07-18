import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export const AIService = {
  async ask(prompt, systemInstruction = "") {
    if (!genAI) {
      throw new Error("AI Service not configured. Please add VITE_GEMINI_API_KEY to your .env file.");
    }

    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: systemInstruction 
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("AI Service Error:", error);
      throw error;
    }
  },

  async translate(text, from, to) {
    const prompt = `Translate the following text from ${from} to ${to}. Return ONLY the translated text, no explanations.
    Text: "${text}"`;
    return this.ask(prompt, "You are a professional translator. Respond only with the translation.");
  }
};
