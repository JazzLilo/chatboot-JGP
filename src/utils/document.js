import fs from "fs";
import {validateDocument} from '../controllers/gemini.controller.js'

export const verfiDocument = async (filePath, documentKey) => {
    const mimeType = getMimeTypeFromKey(documentKey);
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString("base64");
    const validationPrompt = getValidationPromptFromKey(documentKey);
    const resultado = await validateDocument(base64Data, mimeType, validationPrompt);
    console.log(resultado);
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
        return "image/jpeg"; // Asumimos JPEG por defecto para fotos
      case "gestora_publica_afp":
        return "application/pdf";
      default:
        return "application/octet-stream"; // tipo por defecto, binario genérico
    }
  };
  
  export const getValidationPromptFromKey = (documentKey) => {
    switch (documentKey) {
      case "foto_ci_an":
        return "Verifica si esta imagen es el anverso de una cédula de identidad boliviana legible y válida.";
      case "foto_ci_re":
        return "Verifica si esta imagen es el reverso de una cédula de identidad boliviana legible y válida.";
      case "croquis":
        return "Analiza si este archivo es un croquis claro de ubicación de domicilio, con referencias visibles.";
      case "boleta_pago1":
      case "boleta_pago2":
      case "boleta_pago3":
        return "Verifica si esta imagen corresponde a una boleta de pago reciente, legible y válida.";
      case "factura":
        return "Analiza si esta imagen es una factura de luz, agua o gas, con datos legibles y reciente.";
      case "gestora_publica_afp":
        return "Verifica si este archivo PDF corresponde a un documento de la Gestora Pública AFP, y contiene información sobre aportes o estado de cuenta.";
      default:
        return "Verifica si el documento enviado es válido, legible y corresponde al tipo solicitado.";
    }
  };
  