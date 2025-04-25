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

export const validateDocument = async (base64Data, mimeType, prompt) => {
  try {
    const { text } = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Modelo actualizado
      contents: [{
        parts: [
          { text: prompt }, // Parte textual (prompt)
          { // Parte del documento
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          }
        ]
      }]
    });

    return text;
  } catch (error) {
    console.error("Error validando documento:", error);
    return "❌ Error al procesar el documento";
  }
};