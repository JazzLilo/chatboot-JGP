
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import { isInApplicationProcess } from '../utils/validate.js';
import { logConversation } from '../utils/logger.js';
import { userStateInit } from '../controllers/user.state.controller.js'
import { contentMenu, messageCancel } from '../utils/message.js'
import { documentIngress } from '../controllers/document.gateway.js';
import { resetUserState } from '../controllers/user.state.controller.js';
import { generateResponse, handleVirtualApplication, continueVirtualApplication, handleUserMessage } from '../controllers/conversation.controller.js';
import { classifyIntent } from '../controllers/gemini.controller.js';
import { getRandomVariation } from '../config/utils.js'
import { tramiteIngress } from "./tramite.controller.js";

export const connectToWhatsApp = async (userStates, prompts, handlers) => {
  const {
  } = handlers;

  console.log("Iniciando conexión con WhatsApp...");
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const sock = makeWASocket({ auth: state, printQRInTerminal: true });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("Connection closed. Reconnecting:", shouldReconnect);
      if (shouldReconnect) connectToWhatsApp(userStates, prompts, handlers);
    } else if (connection === "open") {
      console.log("Conexión a WhatsApp establecida");
    }
  });

  sock.ev.on("messages.upsert", async (m) => {
    if (m.type === "notify" && !m.messages[0].key.fromMe) {
      const message = m.messages[0];
      const id = message.key.remoteJid;

      // Revisar si el usuario tiene un estado activo
      if (!userStates[id]) {
        console.log("Nuevo usuario conectado:", id);
        userStateInit(userStates, id);
        const initialMenu = getRandomVariation(prompts["saludo"]) + "\n" + contentMenu;
        await sock.sendMessage(id, { text: initialMenu });
        logConversation(id, initialMenu, "bot");
        return;
      } else if (userStates[id].state === "baned") {
        // Si el usuario ha sido baneado, no procesar más mensajes
        await sock.sendMessage(id, { text: messageCancel });
        logConversation(id, messageCancel, "bot");
        return;
      }

      const userState = userStates[id].state;
      const userData = userStates[id].data;

      // Manejo de recepción de documentos
      if (userStates[id].in_application && userStates[id].current_document) {
        if (userStates[id].intents == 3) {
          userStates[id].state = "finished";
          userStates[id].in_application = false;
          delete userStates[id].timeout;
          delete userStates[id].intents;
          resetUserState(userStates, id);
          sock.sendMessage(id, { text: `❌ Demasiados intentos inválidos. Por favor, inicie el trámite nuevamente.\n\n${contentMenu}` });
          return;
        }
        console.log("Recibiendo documento:", userStates[id].current_document);
        await documentIngress(userStates, message, sock);
      }

      // Manejo normal de mensajes
      const mensaje = message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        message.message?.documentMessage?.caption ||
        message.message?.locationMessage ||
        "";

      // Registrar la conversación
      logConversation(id, mensaje, "usuario");
      console.log("Mensaje recibido:", mensaje);
      console.log("Estado del usuario:", userStates[id].state);



      if (userStates[id].state === "INIT") {
        const num = parseInt(mensaje);
        if (!isNaN(num)) {
          // Es un número del menú
          switch (num) {
            case 1: {
              const reply = `${getRandomVariation(prompts["informacion_general"])}\n${contentMenu}`;
              await sock.sendMessage(id, { text: reply });
              logConversation(id, reply, "bot");
              return; // Usar return en lugar de break
            }
            case 2: {
              const reply = `${getRandomVariation(prompts["requisitos"])}\n${contentMenu}`;
              await sock.sendMessage(id, { text: reply });
              logConversation(id, reply, "bot");
              return;
            }
            case 3: {
              const reply = `${prompts["sucursales_horarios"].content}\n${contentMenu}`;
              await sock.sendMessage(id, { text: reply });
              logConversation(id, reply, "bot");
              return;
            }
            case 4: {
              const reply = await handleVirtualApplication(id, mensaje, userStates, prompts);
              await sock.sendMessage(id, { text: reply });
              logConversation(id, reply, "bot");
              return;
            }
            default: {
              const reply = `Opción inválida. Por favor, selecciona una opción de 1-4.\n${contentMenu}`;
              await sock.sendMessage(id, { text: reply });
              logConversation(id, reply, "bot");
              return;
            }
          }
        } else {
          // Texto libre
          const intent = await classifyIntent(mensaje);
          const respuesta = await generateResponse(intent, mensaje, id, prompts, userStates);
          await sock.sendMessage(id, { text: respuesta });
          logConversation(id, respuesta, "bot");
        }
        return;
      }

      // Manejo de estados del trámite
      if (userStates[id].state === "baned") {
        const respuesta = `⏳ Has alcanzado el límite de intentos de cancelación, intente en unos minutos.`;
        await sock.sendMessage(id, { text: respuesta });
        logConversation(id, respuesta, "bot");

      } else if (userStates[id].state !== "finished") {
        const enTramite = isInApplicationProcess(userStates, id);
        console.log("Estado del usuario:", userStates);

        const respuesta = enTramite
          ? await continueVirtualApplication(
            userStates[id].state,
            userData,
            id,
            mensaje,
            userStates,
            prompts
          )
          : await handleUserMessage(id, mensaje, prompts, userStates);
        console.log("Respuesta del bot:", respuesta);
        await sock.sendMessage(id, { text: respuesta });
        logConversation(id, respuesta, "bot");


      } else if (userStates[id].state == "limit_retries") {
        const respuesta = `⏳ Has alcanzado el límite de intentos, intente en unos minutos.`;
        await sock.sendMessage(id, { text: respuesta });
        logConversation(id, respuesta, "bot");

      } else {
        const mensajeEspera = `⏳ El chatbot se está reiniciando y no puede procesar nuevos mensajes ahora. Por favor, espera unos minutos antes de intentar nuevamente.`;
        await sock.sendMessage(id, { text: mensajeEspera });
        logConversation(id, mensajeEspera, "bot");
        resetUserState(userStates, id);
      }

    }
  });

  return sock;
}