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
    messageProcessFileError,
    messageRequestFileCiError,
    messageRequestFileCustodiaError
} from '../utils/message.js';
import { userStateInit } from '../controllers/user.state.controller.js';
import {
    getDocumentState,
    getNextDocumentKey
} from '../utils/document.flow.js'
import { userStateExededRetryLimit } from '../controllers/user.state.controller.js';

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
        logConversation(id, `Resultado procesamiento: ${JSON.stringify(result)}`, 'bot');

        await handleValidationResult(result, key, userState, userStates, sock, id);

    } catch (error) {
        console.error(`Error crítico en documentIngress [${id}]:`, error);
        const sender = message.key.remoteJid;

        if (userStates[sender]) {
            userStates[sender].intents += 1;
            if (userStates[sender].intents >= 3) {
                await handleExceededAttempts(userStates, sock, sender);
                return;
            }
        }

        try {
            await sock.sendMessage(id, { text: messageProcessFileError });
        } catch (sendError) {
            console.error('Error al enviar mensaje de error:', sendError);
        }
    }
}

function isMediaMessage(message) {
    try {
        const { documentMessage, imageMessage, videoMessage } = message.message || {};
        return Boolean(documentMessage || imageMessage || videoMessage);
    } catch (error) {
        console.error('Error verificando tipo de mensaje:', error);
        return false;
    }
}

async function sendRequestFileMessage(sock, id) {
    try {
        await sock.sendMessage(id, { text: messageRequestFile });
    } catch (error) {
        console.error(`Error enviando solicitud de archivo [${id}]:`, error);
        throw new Error('Falló el envío de solicitud de archivo');
    }
}

async function downloadAndExtractMedia(message) {
    try {
        const buffer = await downloadMediaMessage(message, 'buffer', {});
        const extension = getFileExtension(message);
        return { buffer, extension };
    } catch (error) {
        console.error('Error descargando archivo multimedia:', error);
        throw new Error('Falló la descarga del archivo');
    }
}

async function saveTemporaryFile(buffer, key, extension) {
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

async function handleValidationResult(result, key, userState, userStates, sock, id) {
    try {
        const isCIReDocument = userState.current_document === 'foto_ci_re';
        const isCustodiaDocument = userState.current_document === 'custodia';
        const nextKey = getNextDocumentKey(key);
        const isValid = result === 'si';

        if (!isValid) {
            const errorMessage = messageRequestFileError(getDocumentDescription(key));
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
                userState.state = 'documentos_recibidos';
                await sock.sendMessage(id, {
                    text: '✅ Todos los documentos han sido recibidos y validados correctamente.'
                });
            }
            else{
                 userState.current_document = nextKey;
                userState.state = getDocumentState(nextKey);
            }
        } else {
            userStates[id].intents = 0;

            if (nextKey) {
                userState.current_document = nextKey;
                userState.state = getDocumentState(nextKey);
            } else {
                userState.state = 'documentos_recibidos';
                await sock.sendMessage(id, {
                    text: '✅ Documentación completa. Proceso finalizado.'
                });
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

async function handleExceededAttempts(userStates, sock, id) {
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