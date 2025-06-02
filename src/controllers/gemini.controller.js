import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from "../config/index.js";
import { INTENT_CLASSIFIER_PROMPT } from "../utils/prompt.js";

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const classifyIntent = async (message) => {
  try {
    const promptText = INTENT_CLASSIFIER_PROMPT.replace("{message}", message);
    console.log("PROMPT DE GEMINI", promptText);
    const { text } = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
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

import fetch from 'node-fetch';

export const getLatLongFromLink = async (link) => {
  try {
    // 1. Obtener HTML de la URL final
    const res = await fetch(link, { redirect: 'follow' });
    const finalUrl = res.url;
    const html = await res.text();

    // 2. Crear prompt para Gemini
    const promptText = `Extrae EXCLUSIVAMENTE las coordenadas geográficas (latitud y longitud) 
    en formato decimal desde esta URL o HTML. Respuesta SOLO en formato JSON: {"lat": number, "lng": number}

    URL: ${finalUrl}
    HTML Fragmento relevante: ${html.slice(0, 15000)} // Acortamos por contexto

    Ejemplo válido: {"lat": -12.12345, "lng": -77.12345}
    Si no hay coordenadas, devuelve null.`;

    // 3. Consultar a Gemini
    const { text } = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ parts: [{ text: promptText }] }],
    });

    // 4. Parsear respuesta
    const jsonMatch = text.match(/\{.*\}/);
    if (!jsonMatch) return null;
    
    const coords = JSON.parse(jsonMatch[0]);
    if (coords?.lat && coords?.lng) {
      return { 
        latitude: parseFloat(coords.lat),
        longitude: parseFloat(coords.lng)
      };
    }

    return null;

  } catch (e) {
    console.error('Error obteniendo coordenadas:', e);
    return null;
  }
}



export const validateDocument = async (base64Data, mimeType, prompt) => {
  try {
    const { text } = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp", // Modelo actualizado
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
    console.log("Respuesta de Gemini:", text);
    return text;
  } catch (error) {
    console.error("Error validando documento:", error);
    return "❌ Error al procesar el documento";
  }
};

export const validateName = async (prompt) => {
  try {
    const { text } = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [{
        parts: [{ text: prompt + "\nResponde solo con 'true' o 'false' sin comillas." }]
      }]
    });

    // Limpiar y normalizar la respuesta
    return text.trim().toLowerCase().startsWith('true') ? "true" : "false";
  } catch (error) {
    console.error("Error validando el nombre:", error);
    return "false"; // Devuelve false por defecto en caso de error
  }
};