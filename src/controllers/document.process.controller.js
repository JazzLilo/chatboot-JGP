import fs from "fs";
import { validateDocument, validateName } from './gemini.controller.js';
import { getDocumentPrompt, getDocumentMimeType } from "../utils/document.flow.js";

/**
 * Procesa un documento o imagen: valida formato, extrae datos y compara con userData.
 * @param {string} filePath - Ruta al archivo
 * @param {string} documentKey - Tipo de documento (foto_ci_an, croquis, etc.)
 * @param {object} userData - Datos ingresados por el usuario (cedula, nombre, ....)
 * @returns {Promise<object>} { policyResult, extracted, matches }
 */
export async function processDocument(filePath, documentKey, userData, userStates, sender) {
  const mimeType = getDocumentMimeType(documentKey);
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString("base64");

  // 1. Validación de legibilidad y formato
  const validationPrompt = getDocumentPrompt(documentKey);
  const policyResult = await validateDocument(base64Data, mimeType, validationPrompt);


  // 2. Validación de legibilidad y formato
  //let copiar el codigo de validateFormat
  let extracted = {};
  switch (documentKey) {
    case 'foto_ci_an':
    case 'foto_ci_re': {
      // Pedimos JSON con campos ci y name
      const extractPrompt = `Extrae de esta imagen la cédula de identidad (CI) y el nombre completo, como obtener el CI si en la imagen detectas una  foto, saca el valor que esta debajo de la foto es es el CI, si no hay un valo debajo del CI, entonces busca en la esquina superior contraria a la foto, si no existe una foto busca el nombre y el CI en la esquina superior izquierda. JSON { \"ci\": \"...\", \"name\": \"...\" }.`;
      const jsonText = await validateDocument(base64Data, mimeType, extractPrompt);
      try {
        extracted = JSON.parse(jsonText);
      } catch {
        // Fallback: parseo manual
        const ciMatch = /\"ci\"\s*:\s*\"(\d{5,10})\"/.exec(jsonText);
        const nameMatch = /\"name\"\s*:\s*\"([^\"]+)\"/.exec(jsonText);
        extracted = {
          ci: ciMatch?.[1] || null,
          name: nameMatch?.[1] || null
        };
      }
      break;
    }
    case 'custodia': {
      const extractPrompt = `Verifica el tipo de documento que es, si es un RUAT o un FOLIO REAL, ambos son documentos Bolivianos. Si son alguno de estos documentos, obten el nombre del propietario en formato JSON { \"document_type\": \"...\", \"name\": \"...\" }.`;
      const jsonText = await validateDocument(base64Data, mimeType, extractPrompt);
      console.log("jsonText", jsonText);
      try {
        extracted = JSON.parse(jsonText);
        console.log("extracted", extracted);
        userStates[sender].data.tipo_documento_custodia = extracted.document_type;
        console.log("userStates[sender].data.tipo_documento_custodia", userStates[sender].data.tipo_documento_custodia);
        userStates[sender].matches = await compareWithUserData(extracted, userData);
      } catch {
        const document_type = /\"document_type\"\s*:\s*\"([^\"]+)\"/.exec(jsonText);
        const nameMatch = /\"name\"\s*:\s*\"([^\"]+)\"/.exec(jsonText);
        extracted = {
          document_type: document_type?.[1] || null,
          name: nameMatch?.[1] || null
        };
        console.log("extracted", extracted);
        userStates[sender].data.tipo_documento_custodia = extracted.document_type;
        console.log("userStates[sender].data.tipo_documento_custodia", userStates[sender].data.tipo_documento_custodia);
        userStates[sender].matches =  await compareWithUserData(extracted, userData);
      }
      break;
    }

  }
  console.log("Datos extraídos:", extracted);
  // 3. Comparación con datos de usuario
  const matches = await compareWithUserData(extracted, userData);
  if (!userStates[sender].matches) {
    userStates[sender].matches = matches;
  } else {
    if (!userStates[sender].matches.ciMatch) {
      userStates[sender].matches = matches;
    }
  }
  const resultado = policyResult.trim(); // "si" o "no"
  return resultado;
}


/**
 * Compara datos extraídos con datos proporcionados por el usuario
 */
async function compareWithUserData(extracted, userData) {
  const results = {};
  if (userData.cedula && extracted.ci) {
    results.ciMatch = await userData.cedula === extracted.ci;
  }
  if (userData.nombre_completo && extracted.name) {
    try {
      const isValid = await validateName(`
      ¿El nombre "${userData.nombre_completo}" es similar a "${extracted.name}, no importa la posición de las palabras ni las tildes o mayusculas"?
      Responde ÚNICAMENTE con "true" o "false".
    `);

      console.log("Resultado validación nombre:", isValid);
      results.nameMatch = isValid === "true"; // Convertir a booleano
    } catch (error) {
      console.error("Error validando nombre:", error);
      results.nameMatch = false;
    }
  }
  if (extracted.latitude && extracted.longitude && userData.latitude && userData.longitude) {
    results.locationMatch =
      Math.abs(extracted.latitude - userData.latitude) < 0.0005 &&
      Math.abs(extracted.longitude - userData.longitude) < 0.0005;
  }
  return results;
}


