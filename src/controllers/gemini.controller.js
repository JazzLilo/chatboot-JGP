import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from "../config/index.js";
import { INTENT_CLASSIFIER_PROMPT } from "../utils/prompt.js";

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const classifyIntent = async (message) => {
  try {
    const promptText = INTENT_CLASSIFIER_PROMPT.replace("{message}", message);
    console.log("PROMPT DE GEMINI", promptText);
    const { text } = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ parts: [{ text: promptText }] }],
    });
    console.log("RESPUESTA DE GEMINI", text);
    if (!text) return "otra_informacion";
    console.log("RESPUESTA DE GEMINI", text);
    return text.trim().toLowerCase();
  } catch (error) {
    console.log("Error al clasificar la intención:", error);
    return "otra_informacion";
  }
};
