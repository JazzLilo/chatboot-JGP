import { ApplicationData } from './tratamientoBD.js'
import fs from 'fs';
import path from 'path';
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage
} from "@whiskeysockets/baileys";
import directoryManager from '../config/directory.js';
import { isInApplicationProcess } from '../utils/validate.js';
import { logConversation } from '../utils/logger.js';
import { verfiDocument } from '../utils/document.js';

export const dataFieldAssignment = (data, documentKey, filePath) => {
  switch (documentKey) {
    case "foto_ci_an":
      data.foto_ci_an = filePath;
      break;
    case "foto_ci_re":
      data.foto_ci_re = filePath;
      break;
    case "croquis":
      data.croquis = filePath;
      break;
    case "boleta_pago1":
      data.boleta_pago1 = filePath;
      break;
    case "boleta_pago2":
      data.boleta_pago2 = filePath;
      break;
    case "boleta_pago3":
      data.boleta_pago3 = filePath;
      break;
    case "factura":
      data.factura = filePath;
      break;
    case "gestora_publica_afp":
      data.gestora_publica_afp = filePath;
      break;
    default:
      console.warn(`Documento desconocido: ${documentKey}`);
  }
}

export const getNextDocument = (currentDocument) => {
  const order = [
    "foto_ci_an",
    "foto_ci_re",
    "croquis",
    "boleta_pago1",
    "boleta_pago2",
    "boleta_pago3",
    "factura",
    "gestora_publica_afp",
  ];

  const currentIndex = order.indexOf(currentDocument);
  if (currentIndex === -1) return null;
  const nextIndex = currentIndex + 1;
  if (nextIndex >= order.length) return null;
  return order[nextIndex];
}

export const getDocumentPrompt = (documentKey,userStates) => {
  switch (documentKey) {
    case "foto_ci_an":
      return `📷 Por favor, envíe la *Foto de CI Anverso*.`;
    case "foto_ci_re":
      return `📷 Por favor, envíe la *Foto de CI Reverso*.`;
    case "croquis":
      return `📐 Por favor, envíe el *Croquis*.`;
    case "boleta_pago1":
      return `💰 Por favor, envíe la *Boleta de Pago 1*.`;
    case "boleta_pago2":
      return `💰 Por favor, envíe la *Boleta de Pago 2*.`;
    case "boleta_pago3":
      return `💰 Por favor, envíe la *Boleta de Pago 3*.`;
    case "factura":
      return `📄 Por favor, envíe la *Factura de Luz, Agua o Gas*.`;
    case "gestora_publica_afp":
      return `📑 Por favor, envíe la *Gestora Pública AFP* en formato PDF.`;
    default:
      return `📄 Por favor, envíe el documento solicitado.`;
  }
}

export const connectToWhatsApp = async (userStates, prompts, handlers) => {
  const {
    handleVirtualApplication,
    handleUserMessage,
    generateResponse,
    classifyIntent,
    contentMenu,
    getRandomVariation,
    continueVirtualApplication  // Añadimos esta línea
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
        userStates[id] = {
          state: "INIT",
          data: new ApplicationData(),
          in_application: false,
          cancelAttempts: 0,
          timeout: setTimeout(() => {
            userStates[id].state = "finished";
            userStates[id].in_application = false;
            delete userStates[id].timeout;
          }, 5 * 60 * 1000),
        };
        const initialMenu = getRandomVariation(prompts["saludo"]) + "\n" + contentMenu;
        await sock.sendMessage(id, { text: initialMenu });
        logConversation(id, initialMenu, "bot");
        return;
      } else if (userStates[id].state === "baned") {
        // Usuario baneado: No permitir acceso
        const mensajeBloqueo = "❌ Has alcanzado el límite de intentos de cancelación.";
        await sock.sendMessage(id, { text: mensajeBloqueo });
        logConversation(id, mensajeBloqueo, "bot");
        return;
      }

      const userState = userStates[id].state;
      const userData = userStates[id].data;

      // Manejo de recepción de documentos
      if (userStates[id].in_application && userStates[id].current_document) {
        try {
          // Validar si el mensaje contiene algún tipo de archivo
          const hasDocument = message.message?.documentMessage;
          const hasImage = message.message?.imageMessage;
          const hasVideo = message.message?.videoMessage;

          if (!hasDocument && !hasImage && !hasVideo) {
            await sock.sendMessage(id, {
              text: "❌ Por favor, envíe un archivo (imagen, documento PDF u otro formato)."
            });
            return;
          }

          // Descargar el archivo
          const buffer = await downloadMediaMessage(message, 'buffer', {});

          // Determinar la extensión basada en el tipo de mensaje
          let fileExt;
          if (hasImage) {
            fileExt = '.jpg';
          } else if (hasVideo) {
            fileExt = '.mp4';
          } else {
            // Para documentos, mantener la extensión original o usar .pdf por defecto
            const originalName = message.message?.documentMessage?.fileName || '';
            fileExt = path.extname(originalName) || '.pdf';
          }

          // Generar nombre único para el archivo
          const timestamp = new Date().getTime();
          const fileName = `${userStates[id].current_document}_${timestamp}${fileExt}`;

          // Asegurar que existe el directorio temporal
          const tempDir = directoryManager.getPath("temp");
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          // Guardar el archivo temporalmente
          const filePath = path.join(tempDir, fileName);
          await fs.promises.writeFile(filePath, buffer);

          // Asignar el archivo al campo correspondiente
          await dataFieldAssignment(userStates[id].data, userStates[id].current_document, filePath);
          console.log("Archivo guardado en:", filePath);
          console.log("Estado del usuario:", userStates[id]);
          const current_document = userStates[id].current_document; 
          await verfiDocument(filePath, current_document);
          // Confirmar recepción del documento
          await sock.sendMessage(id, {
            text: `✅ ${userStates[id].current_document} recibido correctamente.`
          });

          // Obtener el siguiente documento a solicitar
          const nextDocument = getNextDocument(userStates[id].current_document);
          
          if (nextDocument) {
            userStates[id].current_document = nextDocument;
            const prompt = getDocumentPrompt(nextDocument);
            console.log("Siguiente documento:", nextDocument);
            console.log("user", userStates[id]);
            
            await sock.sendMessage(id, { text: prompt });
          } else {
            userStates[id].state = "documentos_recibidos";
            const respuesta = await handlers.continueVirtualApplication(
              userStates[id].state,
              userStates[id].data,
              id,
              "documentos_completos",
              userStates,
              prompts
            );
            await sock.sendMessage(id, { text: respuesta });
          }

          return;
        } catch (error) {
          console.error('Error procesando documento:', error);
          await sock.sendMessage(id, {
            text: "❌ Hubo un error al procesar el archivo. Por favor, intente nuevamente."
          });
          return;
        }
      }

      // Manejo normal de mensajes
      const mensaje = message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        message.message?.documentMessage?.caption ||
        "";

      // Registrar la conversación
      logConversation(id, mensaje, "usuario");

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

        const respuesta = enTramite
          ? await handlers.continueVirtualApplication(
            userStates[id].state,
            userData,
            id,
            mensaje,
            userStates,
            prompts
          )
          : await handleUserMessage(id, mensaje);

        await sock.sendMessage(id, { text: respuesta });
        logConversation(id, respuesta, "bot");

      } else {
        const mensajeEspera = `⏳ El chatbot se está reiniciando y no puede procesar nuevos mensajes ahora. Por favor, espera 5 minutos antes de intentar nuevamente.`;
        await sock.sendMessage(id, { text: mensajeEspera });
        logConversation(id, mensajeEspera, "bot");
      }

    }
  });

  return sock;
}