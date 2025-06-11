import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";
import { handleIncomingMessage } from "../controllers/message.controller.js";

/**
 * Establece la conexión con WhatsApp y configura los eventos de conexión
 * y recepción de mensajes.
 * @param {Object} userStates - Estados de los usuarios
 * @param {Object} prompts - Prompts para las respuestas
 * @param {Object} handlers - Controladores para los eventos
 * @returns {Promise<import("@whiskeysockets/baileys").WAConnection>} - Conexión establecida
 */
export const connectToWhatsApp = async (userStates, prompts, handlers) => {
  console.log("Iniciando conexión con WhatsApp...");

  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("Conexión cerrada. Reconectando:", shouldReconnect);
      if (shouldReconnect) connectToWhatsApp(userStates, prompts, handlers);
    } else if (connection === "open") {
      console.log("Conexión a WhatsApp establecida");
    }
  });

  sock.ev.on("messages.upsert", async (m) => {
    if (m.type !== "notify") return;
    const message = m.messages[0];
    if (message.key.fromMe) return;

    await handleIncomingMessage(message, sock, userStates, prompts);
  });

  return sock;
};
