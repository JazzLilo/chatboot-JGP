import fs from 'fs';
import { normalize } from '../utils/validate.js';
import { negativePatterns, positivePatterns } from '../utils/regex.js';

/**
 * Carga un prompt desde un archivo JSON.
 * 
 * @param {string} filePath - La ruta al archivo JSON.
 * @returns {object} - El contenido del archivo JSON.
 */
export const loadPrompt = (filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(data);
        // console.log(`Prompt cargado desde ${filePath}:`, json); // Log de depuración
        return json;
    }catch (error) {
        console.error(`Error al cargar el prompt desde ${filePath}:`, error);
        throw error; // Lanzar el error para manejarlo donde se llame la función
    }
}

/**
 * Selecciona una variación aleatoria de las disponibles en el prompt.
 * 
 * @param {object} prompt - El objeto de prompt cargado desde JSON.
 * @returns {string} - La variación seleccionada.
 */
export const getRandomVariation = (prompt) => {
    if (prompt.variaciones && prompt.variaciones.length > 0) {
        const index = Math.floor(Math.random() * prompt.variaciones.length);
        return prompt.variaciones[index];
    }
    return prompt.content || "Lo siento, no tengo una respuesta para eso.";
}

/**
 * Clasifica las respuestas de Sí o No.
 * 
 * @param {string} msg - La respuesta del usuario.
 * @returns {boolean|null} - true si es afirmativo, false si es negativo, null si no se puede clasificar.
 */
export const classifyYesNo = (msg) => {
    const normalizedMsg = normalize(msg);
    // Verificamos patrones afirmativos
    for (const pattern of positivePatterns) {
        if (pattern.test(normalizedMsg)) return true;
    }

    // Verificamos patrones negativos
    for (const pattern of negativePatterns) {
        if (pattern.test(normalizedMsg)) return false;
    }

    return null;
}

