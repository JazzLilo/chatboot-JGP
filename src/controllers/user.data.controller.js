import { writeFile, rename } from 'fs/promises';
import path from 'path';
import { insertSolicitud, insertFileLocation } from './tratamientoBD.js'
import { DOCUMENT_TYPES } from '../utils/constant.js'
import { createSessionDirectory } from '../controllers/session.controller.js';
import { generateApplicationContent } from '../utils/generate.js';


export const saveApplicationData = async (sender, data) => {
  try {
    const solicitudId = await insertSolicitud(data);
    if (!solicitudId) throw new Error('Error insertando solicitud en BD');
    const sessionPath = await createSessionDirectory(sender, solicitudId);

    const fileContent = generateApplicationContent(data, sender);
    const metadataPath = path.join(sessionPath, `solicitud_${solicitudId}.txt`);
    await writeFile(metadataPath, fileContent, 'utf-8');
    await processDocuments(sessionPath, solicitudId, data);
    return {
      success: true,
      solicitudId,
      sessionPath,
      documents: DOCUMENT_TYPES.map(({ key }) => data[key]).filter(Boolean)
    };

  } catch (error) {
    console.error('Error en saveApplicationData:', error.message);
    return {
      success: false,
      error: error.message,
      solicitudId: data.solicitudId || null
    };
  }
}

const processDocuments = async (sessionPath, solicitudId, data) => {
  const processedDocs = [];

  for (const { key, type } of DOCUMENT_TYPES) {
    const sourcePath = data[key];
    if (!sourcePath) continue;

    try {
      const fileExt = path.extname(sourcePath);
      const destPath = path.join(sessionPath, `${key}${fileExt}`);

      await rename(sourcePath, destPath);
      await insertFileLocation(solicitudId, destPath, type);

      processedDocs.push(destPath);
    } catch (error) {
      console.error(`Error procesando documento ${type}:`, error);
      throw new Error(`Error al procesar ${type}`);
    }
  }

  return processedDocs;
};