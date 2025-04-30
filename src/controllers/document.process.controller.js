import fs from "fs";
import ExifParser from "exif-parser";
import fetch from 'node-fetch';
import { validateDocument } from './gemini.controller.js';

/**
 * Procesa un documento o imagen: valida formato, extrae datos y compara con userData.
 * @param {string} filePath - Ruta al archivo
 * @param {string} documentKey - Tipo de documento (foto_ci_an, croquis, etc.)
 * @param {object} userData - Datos ingresados por el usuario (cedula, nombre, ....)
 * @returns {Promise<object>} { policyResult, extracted, matches }
 */
export async function processDocument(filePath, documentKey, userData) {
  const mimeType = getMimeTypeFromKey(documentKey);
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString("base64");

  // 1. Validación de legibilidad y formato
  const validationPrompt = getValidationPromptFromKey(documentKey);
  console.log("Validación de legibilidad y formato:", validationPrompt);
  const policyResult = await validateDocument(base64Data, mimeType, validationPrompt);


  // 2. Validación de legibilidad y formato
  //let copiar el codigo de validateFormat
  // 3. Comparación con datos de usuario
  //const matches = compareWithUserData(extracted, userData);
  //return { policyResult, extracted, matches };
  const resultado = policyResult.trim(); // "si" o "no"
  console.log("Resultado de la validación:", resultado);
  return resultado;
}

/**
 * Validación de legibilidad y formato si llegua a ser necesario
 */

async function validateFormat(base64Data, mimeType, validationPrompt) {
  // 2. Extracción de texto o datos con Gemini
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
    case 'croquis': {
      // 2a. Intentar EXIF
      try {
        const { tags } = ExifParser.create(fileBuffer).parse();
        if (tags.GPSLatitude && tags.GPSLongitude) {
          extracted = { latitude: tags.GPSLatitude, longitude: tags.GPSLongitude };
          break;
        }
      } catch { }
      // 2b. Si no EXIF, extraer dirección con Gemini y geocodificar
      const dirPrompt = `Extrae la dirección completa que aparece en este croquis como texto, Busca en La Paz, Bolivia.`;
      const address = await validateDocument(base64Data, mimeType, dirPrompt);
      if (!address) {
        extracted = { error: 'No se encontró dirección en el croquis.' };
        break;
      }
      const coords = await geocodeAddress(address.trim());
      extracted = coords || { error: 'No se pudo geolocalizar la dirección extraída.' };
      break;
    }
    default: {
      // Texto genérico
      const textPrompt = `Extrae todo el texto legible de este documento.`;
      const raw = await validateDocument(base64Data, mimeType, textPrompt);
      extracted = { rawText: raw };
    }
  }
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
    results.nameMatch = extracted.name.toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ') ===
      userData.nombre_completo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
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
      return `Analiza si esta imagen corresponde a una boleta de pago reciente, legible y válida.
La fecha de hoy es ${dateToday}.

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

    default:
      return `Analiza si el documento enviado es legible y corresponde al tipo solicitado.
La fecha de hoy es ${dateToday}.

Responde únicamente con:
"si" o "no"`;
  }
};

