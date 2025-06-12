import fs from 'fs';
import path from 'path';
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import directoryManager from '../config/directory.js';
import { logConversation } from '../utils/logger.js';
import { processDocument } from '../controllers/document.process.controller.js';

import { userStateFinished } from '../controllers/user.state.controller.js';

import {
    messageRequestFile,
    messageRequestFileError,
    messageProcessFileError,
    messageRequestFileCiError,
    messageRequestFileCustodiaError
} from '../utils/message.js';
import { userStateInit } from '../controllers/user.state.controller.js';
import {
    getDocumentState,
    getNextDocumentKey,
    getDocumentMessage,
    dataFieldAssignment
} from '../utils/document.flow.js'
import { userStateExededRetryLimit } from '../controllers/user.state.controller.js';
import { saveApplicationData } from '../controllers/user.data.controller.js';
export const documentIngress = async (userStates, message, sock) => {
    const id = message.key.remoteJid;

    try {
        if (!id) throw new Error('ID de conversación no válido');

        const userState = userStates[id] || userStateInit(id);
        if (message.message.conversation?.toLowerCase().includes("cancelar")) return;

        if (!isMediaMessage(message)) {
            userStates[id].intents += 1;
            return await sendRequestFileMessage(sock, id);
        }

        const { buffer, extension } = await downloadAndExtractMedia(message);
        const key = userState.current_document;
        const filePath = await saveTemporaryFile(buffer, key, extension);

        await dataFieldAssignment(userState.data, key, filePath);
        logConversation(id, `Archivo guardado: ${filePath}`, 'bot');

        const result = await processDocument(filePath, key, userState.data, userStates, id);
        console.log(`Resultado procesamiento [${id}]:`, result);
        logConversation(id, `Resultado procesamiento: ${JSON.stringify(result)}`, 'bot');

        await handleValidationResult(result, key, userState, userStates, sock, id);

    } catch (error) {
        console.error(`Error crítico en documentIngress [${id}]:`, error);
        const id = message.key.remoteJid;

        if (userStates[id]) {
            userStates[id].intents += 1;
            if (userStates[id].intents >= 3) {
                await handleExceededAttempts(userStates, sock, id);
                return;
            }
        }

        try {
            await sock.sendMessage(id, { text: messageProcessFileError });
        } catch (idror) {
            console.error('Error al enviar mensaje de error:', idror);
        }
    }
}

export function isMediaMessage(message) {
    try {
        const { documentMessage, imageMessage, videoMessage } = message.message || {};
        return Boolean(documentMessage || imageMessage || videoMessage);
    } catch (error) {
        console.error('Error verificando tipo de mensaje:', error);
        return false;
    }
}

export async function sendRequestFileMessage(sock, id) {
    try {
        await sock.sendMessage(id, { text: messageRequestFile });
    } catch (error) {
        console.error(`Error enviando solicitud de archivo [${id}]:`, error);
        throw new Error('Falló el envío de solicitud de archivo');
    }
}

export async function downloadAndExtractMedia(message) {
    try {
        const buffer = await downloadMediaMessage(message, 'buffer', {});
        const extension = getFileExtension(message);
        return { buffer, extension };
    } catch (error) {
        console.error('Error descargando archivo multimedia:', error);
        throw new Error('Falló la descarga del archivo');
    }
}

export async function saveTemporaryFile(buffer, key, extension) {
    try {
        const tempDir = directoryManager.getPath('temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const fileName = `${key}_${Date.now()}${extension}`;
        const filePath = path.join(tempDir, fileName);
        await fs.promises.writeFile(filePath, buffer);
        return filePath;
    } catch (error) {
        console.error('Error guardando archivo temporal:', error);
        throw new Error('Falló el guardado temporal del archivo');
    }
}

export async function handleValidationResult(result, key, userState, userStates, sock, id) {
    try {
        console.log(`Manejando resultado de validación [${id}]:`, result);
        const isCIReDocument = userState.current_document === 'foto_ci_re';
        const isCustodiaDocument = userState.current_document === 'custodia';
        const nextKey = getNextDocumentKey(key);
        const isValid = result === 'si';

        if (!isValid) {
            const errorMessage = messageRequestFileError(getDocumentMessage(key));
            return await handleInvalidAttempt(userStates, sock, id, errorMessage);
        }

        if (isCIReDocument && !userStates[id].matches.ciMatch) {
            userStates[id].current_document = 'foto_ci_an';
            userStates[id].state = getDocumentState('foto_ci_an');
            return await handleInvalidAttempt(userStates, sock, id, messageRequestFileCiError);
        }

        if (isCustodiaDocument) {
            console.log("userStates[id].data.tipo_documento_custodia", userStates[id].matches);
            if (!userStates[id].matches.nameMatch) {
                userStates[id].current_document = 'custodia';
                userStates[id].state = getDocumentState('custodia');
                return await handleInvalidAttempt(userStates, sock, id, messageRequestFileCustodiaError);
            }
            if (userStates[id].data.tipo_documento_custodia === 'RUAT') {
                await saveDataUser(userStates, id, sock);
            }
            else {
                userState.current_document = nextKey;
                userState.state = getDocumentState(nextKey);
                await sock.sendMessage(id, {
                    text: `✅ Documento validado correctamente.\n ${getDocumentMessage(nextKey)}`
                });
            }
        } else {
            userStates[id].intents = 0;

            if (nextKey) {
                userState.current_document = nextKey;
                userState.state = getDocumentState(nextKey);
                await sock.sendMessage(id, {
                    text: `✅ Documento validado correctamente.\n ${getDocumentMessage(nextKey)}`
                });
            } else {
                await saveDataUser(userStates, id, sock);
            }

        }


    } catch (error) {
        console.error(`Error manejando resultado de validación [${id}]:`, error);
        throw new Error('Falló el procesamiento de validación');
    }
}

async function handleInvalidAttempt(userStates, sock, id, errorMessage) {
    try {
        userStates[id].intents += 1;

        if (userStates[id].intents >= 3) {
            await handleExceededAttempts(userStates, sock, id);
            return;
        }

        await sock.sendMessage(id, { text: errorMessage });
    } catch (error) {
        console.error(`Error manejando intento inválido [${id}]:`, error);
        throw new Error('Falló el manejo de intento inválido');
    }
}

export async function handleExceededAttempts(userStates, sock, id) {
    try {
        userStateExededRetryLimit(userStates, id);
        await sock.sendMessage(id, {
            text: '❌ Has alcanzado el límite de intentos. Por favor, intenta nuevamente en unos minutos.'
        });
    } catch (error) {
        console.error(`Error manejando límite de intentos [${id}]:`, error);
    }
}


export function getFileExtension(message) {
    try {
        const { documentMessage, imageMessage, videoMessage } = message.message || {};
        if (imageMessage) return '.jpg';
        if (videoMessage) return '.mp4';
        const original = documentMessage?.fileName || '';
        return path.extname(original) || '.pdf';
    } catch (error) {
        console.error('Error obteniendo extensión de archivo:', error);
        return '.bin'; // Extensión genérica como fallback
    }
}

export async function saveDataUser(userStates, id, sock) {
    try {
        const userTempDir = directoryManager.getPath("temp") + "/" + id;
        if (fs.existsSync(userTempDir)) {
            fs.rmSync(userTempDir, { recursive: true, force: true });
        }

        const saveSuccess = await saveApplicationData(id,  userStates[id].data);

        if (saveSuccess) {

            const closureMessage = `✅ Todos los documentos han sido recibidos y guardados correctamente. El chatbot se cerrará ahora y se reiniciará en 5 minutos. Por favor, vuelve a contactarnos después de este tiempo.`;
            sock.sendMessage(id, { text: closureMessage });
            logConversation(id, closureMessage, "bot");
            userStateFinished(userStates, id);
            return closureMessage;
        } else {
            return `❌ Hubo un error al guardar tu solicitud. Por favor, intenta nuevamente o contacta con soporte técnico.`;
        }
    } catch (error) {
        console.error("Error al guardar la solicitud:", error);
        return `❌ Ocurrió un error inesperado al procesar tu solicitud. Por favor, intenta nuevamente o contacta con soporte técnico.`;
    }
}