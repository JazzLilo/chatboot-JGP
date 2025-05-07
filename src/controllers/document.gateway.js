import fs from 'fs';
import path from 'path';
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import directoryManager from '../config/directory.js';
import { logConversation } from '../utils/logger.js';
import { processDocument } from '../controllers/document.process.controller.js';
import {
    getDocumentPrompt,
    getNextDocument,
    dataFieldAssignment,
    getDocumentDescription
} from '../utils/conversation.prompts.js';
import {
    messageRequestFile,
    messageRequestFileSuccess,
    messageRequestFileError,
    messageProcessFileError
} from '../utils/message.js';
import { userStateInit } from '../controllers/user.state.controller.js';
import {
    getDocumentState,
    getNextDocumentKey
 } from '../utils/document.flow.js'
import { userStateExededRetryLimit } from '../controllers/user.state.controller.js';

/**
 * Orquesta la recepción y validación de documentos en WhatsApp.
 */
export const documentIngress = async (userStates, message, sock) => {
    const id = message.key.remoteJid;
    const userState = userStates[id] || userStateInit(id);
    console.log('*-*-*-**-*-*-*-*-*-*-*-*')
    console.log(message.message.conversation?.toLowerCase().includes("cancelar"))
    console.log('*-*-*-**-*-*-*-*-*-*-*-*')
    if ( message.message.conversation?.toLowerCase().includes("cancelar")) { console.log('******--------*********'); return}; 
    if (!isMediaMessage(message)) {
        userStates[id].intents += 1
        console.log(userStates[id].intents)
        return sendRequestFileMessage(sock, id);
    }

    try {
        const { buffer, extension } = await downloadAndExtractMedia(message);
        const key = userState.current_document;
        const filePath = await saveTemporaryFile(buffer, key, extension);

        await dataFieldAssignment(userState.data, key, filePath);
        logConversation(id, `Archivo guardado: ${filePath}`, 'bot');

        const result = await processDocument(filePath, key, userState.data, userStates, id);
        logConversation(id, `Resultado procesamiento: ${JSON.stringify(result)}`, 'bot');

        await handleValidationResult(result, key, userState, userStates, sock, id);
    } catch (error) {
        userStates[sender].intents += 1
        console.log(userStates[sender].intents)
        console.error(`Error en documentIngress [${id}]:`, error);
        await sock.sendMessage(id, { text: messageProcessFileError });
    }
}

/**
 * Verifica si el mensaje contiene documento, imagen o video.
 */
function isMediaMessage(message) {
    
    const { documentMessage, imageMessage, videoMessage } = message.message || {};
    return Boolean(documentMessage || imageMessage || videoMessage);
}

/**
 * Solicita al usuario que envíe un archivo.
 */
async function sendRequestFileMessage(sock, id) {
   
    await sock.sendMessage(id, { text: messageRequestFile });
}

/**
 * Descarga el media y devuelve el buffer y la extensión.
 */
async function downloadAndExtractMedia(message) {
    const buffer = await downloadMediaMessage(message, 'buffer', {});
    const extension = getFileExtension(message);
    return { buffer, extension };
}

/**
 * Guarda buffer en un archivo temporal y devuelve la ruta.
 */
async function saveTemporaryFile(buffer, key, extension) {
    const tempDir = directoryManager.getPath('temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const fileName = `${key}_${Date.now()}${extension}`;
    const filePath = path.join(tempDir, fileName);
    await fs.promises.writeFile(filePath, buffer);
    return filePath;
}

/**
 * Maneja el flujo tras la validación: éxito o error.
 */
async function handleValidationResult(result, key, userState, userStates, sock, id) {
    const responese = messageRequestFileSuccess(getDocumentDescription(key));
    console.log(responese)
    if (result === 'si') {
        userStates[id].intents = 0
        const nextKey = getNextDocumentKey(key);
        if (nextKey) {
            userState.current_document = nextKey;
            userState.state = getDocumentState(nextKey);
        } else {
            userState.state = 'documentos_recibidos';
            // Aquí continúa el proceso completo
        }
    } else {
        userStates[id].intents += 1
        if (userStates[id].intents >= 3) {
            
            userStateExededRetryLimit(userStates, id);
            await sock.sendMessage(id, {
                text: '❌ Has alcanzado el límite de intentos. Por favor, intenta nuevamente en unos minutos.'
            });
        }
        console.log(userStates[id].intents)
        await sock.sendMessage(id, {
            text: messageRequestFileError(getDocumentDescription(key))
        });
    }
}

/**
 * Obtiene extensión de archivo según tipo de media.
 */
export function getFileExtension(message) {
    const { documentMessage, imageMessage, videoMessage } = message.message || {};
    if (imageMessage) return '.jpg';
    if (videoMessage) return '.mp4';
    const original = documentMessage?.fileName || '';
    return path.extname(original) || '.pdf';
}
