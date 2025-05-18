import fs from "fs";
import ExifParser from "exif-parser";
import fetch from 'node-fetch';
import { validateDocument, validateName } from './gemini.controller.js';

/**
 * Procesa un documento o imagen: valida formato, extrae datos y compara con userData.
 * @param {string} filePath - Ruta al archivo
 * @param {string} documentKey - Tipo de documento (foto_ci_an, croquis, etc.)
 * @param {object} userData - Datos ingresados por el usuario (cedula, nombre, ....)
 * @returns {Promise<object>} { policyResult, extracted, matches }
 */
export async function processDocument(filePath, documentKey, userData, userStates, sender) {
  const mimeType = getMimeTypeFromKey(documentKey);
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString("base64");

  // 1. Validación de legibilidad y formato
  const validationPrompt = getValidationPromptFromKey(documentKey);
  const policyResult = await validateDocument(base64Data, mimeType, validationPrompt);


  // 2. Validación de legibilidad y formato
  //let copiar el codigo de validateFormat
  let extracted = {};
  switch (documentKey) {
    case 'foto_ci_an':
    case 'foto_ci_re': {
      // Pedimos JSON con campos ci y name
      const extractPrompt = `Extrae de esta imagen la cédula de identidad (CI) y el nombre completo en formato JSON { \"ci\": \"...\", \"name\": \"...\" }.`;
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
    case 'custodia':{
      const extractPrompt = `Verifica el tipo de documento que es, si es un RUAT o un FOLIO REAL, ambos son documentos Bolivianos. Si son alguno de estos documentos, obten el nombre del propietario en formato JSON { \"document_type\": \"...\", \"name\": \"...\" }.`;
      const jsonText = await validateDocument(base64Data, mimeType, extractPrompt);
      console.log("jsonText", jsonText);
      try {
        extracted = JSON.parse(jsonText);
        /*
        {
 "document_type": "FOLIO REAL",
 "name": "VIDAL VELASCO URQUIDI MARIA"
}
        */ 
        console.log("extracted", extracted);
        userStates[sender].data.tipo_documento_custodia =  extracted.document_type;
        console.log("userStates[sender].data.tipo_documento_custodia", userStates[sender].data.tipo_documento_custodia);
        userStates[sender].matches = compareWithUserData(extracted, userData);
      } catch {
        // Fallback: parseo manual
        const document_type = /\"document_type\"\s*:\s*\"([^\"]+)\"/.exec(jsonText);
        const nameMatch = /\"name\"\s*:\s*\"([^\"]+)\"/.exec(jsonText);
        extracted = {
          document_type: document_type?.[1] || null,
          name: nameMatch?.[1] || null
        };
        console.log("extracted", extracted);
        userStates[sender].data.tipo_documento_custodia =  extracted.document_type;
        console.log("userStates[sender].data.tipo_documento_custodia", userStates[sender].data.tipo_documento_custodia);
        userStates[sender].matches = compareWithUserData(extracted, userData);
      }
      break;
    }

  }
  console.log("Datos extraídos:", extracted);
  // 3. Comparación con datos de usuario
  const matches = compareWithUserData(extracted, userData);
  if (!userStates[sender].matches) {
    userStates[sender].matches = matches;
  } else {
    if (!userStates[sender].matches.ciMatch) {
      userStates[sender].matches = matches;
    }
  }
    //return { policyResult, extracted, matches };
    const resultado = policyResult.trim(); // "si" o "no"
    return resultado;
  }

  /**
   * Geocoding con Google Maps API
   */
  async function geocodeAddress(address) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.status === 'OK' && json.results.length) {
      const loc = json.results[0].geometry.location;
      return { latitude: loc.lat, longitude: loc.lng, address: json.results[0].formatted_address };
    }
    return null;
  }

  /**
   * Compara datos extraídos con datos proporcionados por el usuario
   */
  function compareWithUserData(extracted, userData) {
    const results = {};
    if (userData.cedula && extracted.ci) {
      results.ciMatch = userData.cedula === extracted.ci;
    }
    if (userData.nombre_completo && extracted.name) {
      results.nameMatch = validateName(`
        ${userData.nombre_completo} es igual a ${extracted.name}
        responde con true o false
        `)

    }
    if (extracted.latitude && extracted.longitude && userData.latitude && userData.longitude) {
      results.locationMatch =
        Math.abs(extracted.latitude - userData.latitude) < 0.0005 &&
        Math.abs(extracted.longitude - userData.longitude) < 0.0005;
    }
    return results;
  }


  export const getMimeTypeFromKey = (documentKey) => {
    switch (documentKey) {
      case "foto_ci_an":
      case "foto_ci_re":
      case "croquis":
      case "boleta_pago1":
      case "boleta_pago2":
      case "boleta_pago3":
      case "factura":
        return "image/jpeg";
      case "gestora_publica_afp":
        return "application/pdf";
      case "custodia":
        return "image/jpeg";
      case "boleta_impuesto":
        return "image/jpeg";
      default:
        return "application/octet-stream";
    }
  };

  export const dateFormatToday = () => {
    const today = new Date();
    const months = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];

    const day = today.getDate();
    const month = months[today.getMonth()];
    const year = today.getFullYear();

    return `${day} de ${month} de ${year}`;
  };


  export const getValidationPromptFromKey = (documentKey) => {

    const dateToday = new Date().toISOString().split('T')[0];
    switch (documentKey) {
      case "foto_ci_an":
        return `Analiza esta imagen y responde únicamente si el anverso de la cédula de identidad boliviana es LEGIBLE y VIGENTE.
La fecha de hoy es ${dateFormatToday()}.
Para saber si está vigente, compara la fecha de vencimiento de la cédula con la fecha actual: 
- Si la fecha de vencimiento es posterior a la fecha actual, entonces la cédula es válida.
- Si ya venció o no es legible, entonces no es válida.

Responde únicamente con:
"si" o "no"`;

      case "foto_ci_re":
        return `Analiza esta imagen y responde únicamente si el reverso de la cédula de identidad boliviana es LEGIBLE, que si solo si sea el reverso de la cédula de identidad.

Responde únicamente con:
"si" o "no"`;

      case "croquis":
        return `Analiza si este archivo es un croquis claro de ubicación de domicilio con referencias visibles.
La fecha de hoy es ${dateToday}.

Responde únicamente con:
"si" o "no"`;

      case "boleta_pago1":
      case "boleta_pago2":
      case "boleta_pago3":
        return `Analiza si esta imagen corresponde a una boleta de pago es legible y válida.

Responde únicamente con:
"si" o "no"`;

      case "factura":
        return `Analiza si esta imagen corresponde a una factura de luz, agua o gas, con datos legibles y reciente.
La fecha de hoy es ${dateToday}.

Responde únicamente con:
"si" o "no"`;

      case "gestora_publica_afp":
        return `Verifica si este archivo PDF corresponde a un documento a alguna gestora de AFP.

Responde únicamente con:
"si" o "no"`;
      case "ubicacion":
        return `No es obligadorio. si el usuario mando saltar, no es necesario que lo analices. Retorna si`
      
      case "documento_custodia":
        return `Analiza si este archivo es un documento de custodia, verifica si es un RUAT o un FOLIO REAL, ambos son documentos Bolivianos.
Responde únicamente con:
"si" o "no"`;
      case "boleta_impuesto":
        return `Analiza si esta imagen corresponde a una boleta de impuesto, con datos legibles y reciente.
Responde únicamente con:
"si" o "no"`;

      default:
        return `Analiza si el documento enviado es legible y corresponde al tipo solicitado.
La fecha de hoy es ${dateToday}.

Responde únicamente con:
"si" o "no"`;
    }
  };

