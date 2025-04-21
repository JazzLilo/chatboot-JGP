import { calculateMonthlyFee, classifyYesNo, getRandomVariation } from '../config/utils.js';
import { resetUserState } from '../controllers/user.controller.js';
import { validateEmail, isInApplicationProcess } from '../utils/validate.js';
import { showVerification } from '../utils/generate.js';
import { connectToWhatsApp, getDocumentPrompt, } from '../controllers/conexionBaileys.js'
import directoryManager from '../config/directory.js';
import { saveApplicationData } from '../controllers/user.data.controller.js';
import { logConversation } from '../utils/logger.js'
import { classifyIntent } from '../controllers/gemini.controller.js';
import { ApplicationData } from '../controllers/tratamientoBD.js'
import fs from "fs";

async function loadPrompts() {
  try {
    const data = await readFile('./src/assets/prompts/prompt.json', 'utf-8');
    const prompts = JSON.parse(data);
    return prompts;
  } catch (error) {
    console.error('Error al cargar el archivo prompt.json:', error);
    return null;
  }
}

export const continueVirtualApplication = async (state, data, sender, userMessage, userStates, prompts) => {
  // Permite cancelar en cualquier momento
  if (userMessage.toLowerCase().includes("cancelar")) {
    clearTimeout(userStates[sender].timeout);
    userStates[sender].state = "finished";
    userStates[sender].in_application = false;
    delete userStates[sender].timeout;
    return `✅ Has cancelado tu solicitud. Puedes iniciar nuevamente el trámite en cualquier momento.\n\n${contentMenu}`;
  }

  switch (state) {
    case "verificar_asalariado": {
      const respuesta = classifyYesNo(userMessage);
      if (respuesta === true) {
        data.es_asalariado = true;
        userStates[sender].state = "nombre";
        userStates[sender].retries = 0;
        return `Ingrese su nombre completo:`;
      } else if (respuesta === false) {

        const message = `❌ Lo sentimos, por ahora solo prestamos para asalariados. Aquí tienes más información:\n\n${getRandomVariation(prompts["requisitos"])}`;
        userStates[sender].state = "INIT";
        return message ? `${message}\n\n` : `${contentMenu}`;
      } else {
        userStates[sender].retries += 1;
        if (userStates[sender].retries >= 3) {
          userStates[sender].state = "finished";
          userStates[sender].in_application = false;
          delete userStates[sender].timeout;
          delete userStates[sender].retries;
          return `❌ Demasiados intentos inválidos. Por favor, inicie el trámite nuevamente.\n\n${contentMenu}`;
        }
        return `❓ Por favor, responda Sí o No. Intentos: ${userStates[sender].retries}/3.`;
      }
    }
    case "nombre": {
      if (!userMessage.trim()) return `❌ Nombre no válido. Intente de nuevo:`;
      data.nombre_completo = userMessage.trim();
      userStates[sender].state = "cedula";
      return `Perfecto, ${data.nombre_completo}.\nAhora, ingrese su numero de ci (ej: 123456):`;
    }
    case "cedula": {
      if (!/^\d+$/.test(userMessage) || userMessage.length < 5) {
        return `❌ Cédula no válida. Intente de nuevo:`;
      }
      data.cedula = userMessage;
      userStates[sender].state = "direccion";
      return `Ahora, ingrese su dirección:`;
    }
    case "direccion": {
      if (!userMessage.trim())
        return `❌ Dirección no válida. Intente de nuevo:`;
      data.direccion = userMessage.trim();
      userStates[sender].state = "email";
      return `Entendido, ahora ingrese su email:`;
    }
    case "email": {
      if (!validateEmail(userMessage)) {
        return `❌ Email no válido. Intente de nuevo:`;
      }
      data.email = userMessage.trim();
      userStates[sender].state = "monto";
      return `Ahora, ingrese el monto solicitado (ej: 5000):`;
    }
    case "monto": {
      // Elimina separadores de miles (comas) y convierte a número
      const val = parseFloat(userMessage.replace(/[^0-9.]/g, ""));

      // Validar que sea un número dentro del rango permitido
      if (isNaN(val) || val < 1000 || val > 10000) {
        return `❌ Monto no válido. Por favor, ingrese un monto entre 1,000 a 100,000`;
      }

      // Guardar el monto si es válido
      data.monto = val;
      userStates[sender].state = "plazo";
      return `Ahora, ingrese el plazo en meses que desea cancelar (1-17):`;
    }
    case "plazo": {
      const meses = parseInt(userMessage);
      if (isNaN(meses) || meses < 1 || meses > 17) {
        return `❌ Plazo no válido. Intente de nuevo:`;
      }
      data.plazo_meses = meses; // Corregir aquí: cambiar plazo_mensual por plazo_meses
      const cuota = calculateMonthlyFee(data.monto, meses);
      if (!cuota) return `❌ Error al calcular cuota. Intente con otro plazo.`;
      data.cuota_mensual = cuota;
      userStates[sender].state = "verificacion";
      return `${showVerification(data)}`;
    }
    case "verificacion": {
      const resp = classifyYesNo(userMessage);
      if (resp === true) {
        // Crear directorio temporal si no existe
        const userTempDir = directoryManager.getPath("temp") + "/" + sender;
        fs.mkdirSync(userTempDir, { recursive: true });

        userStates[sender].state = "solicitar_documento_foto_ci_an";
        userStates[sender].current_document = "foto_ci_an";
        return getDocumentPrompt("foto_ci_an");
      } else if (resp === false) {
        userStates[sender].state = "correccion";
        return `🔄 ¿Qué dato deseas corregir?\n1️⃣ Nombre\n2️⃣ Cédula\n3️⃣ Dirección\n4️⃣ Email\n5️⃣ Monto\n6️⃣ Plazo\n(Escribe el número de la opción o 'cancelar' para terminar.)`;
      } else {
        return `❓ Responda Sí✔️ o No❌.`;
      }
    }
    case "correccion": {
      const opcion = parseInt(userMessage);
      if (![1, 2, 3, 4, 5, 6].includes(opcion)) {
        return `❌ Opción no válida, intente de nuevo:`;
      }

      userStates[sender].state = map[opcion];
      return `Ingrese el nuevo valor (o 'cancelar' para terminar):`;
    }

    // Manejo de estados para correcciones
    case "correccion_nombre":
    case "correccion_cedula":
    case "correccion_direccion":
    case "correccion_email":
    case "correccion_monto":
    case "correccion_plazo": {
      const field = state.split("_")[1];
      console.log(`Estado de Corrección: ${state}, Campo a corregir: ${field}`);

      switch (field) {
        case "nombre":
          if (!userMessage.trim())
            return `❌ Nombre inválido, intente de nuevo:`;
          data.nombre_completo = userMessage.trim();
          break;
        case "cedula":
          if (!/^\d+$/.test(userMessage) || userMessage.length < 5)
            return `❌ Cédula no válida:`;
          data.cedula = userMessage;
          break;
        case "direccion":
          if (!userMessage.trim()) return `❌ Dirección no válida:`;
          data.direccion = userMessage.trim();
          break;
        case "email":
          if (!validateEmail()) return `❌ Email no válido:`;
          data.email = userMessage.trim();
          break;
        case "monto":
          const val = parseFloat(userMessage.replace(/[^0-9.]/g, ""));
          if (isNaN(val) || val < 1000 || val > 100000)
            return `❌ Monto no válido. Por favor, ingrese un monto entre 1,000 y 100,000. Ejemplo: 5000 o 15,000.`;
          data.monto = val;
          data.cuota_mensual = calculateMonthlyFee(
            data.monto,
            data.plazo_mensual
          );
          break;
        case "plazo":
          const meses = parseInt(userMessage);
          if (isNaN(meses) || meses < 1 || meses > 24)
            return `❌ Plazo no válido. Intente de nuevo:`;
          data.plazo_mensual = meses;
          data.cuota_mensual = calculateMonthlyFee(data.monto, meses);
          break;
        default:
          return `❌ Campo desconocido. Intente de nuevo:`;
      }

      userStates[sender].state = "verificacion";
      return `${showVerification(data)}`;
    }

    // Estados para solicitud de documentos
    case "solicitar_documento_foto_ci_an": {
      userStates[sender].current_document = "foto_ci_an";
      return `📷 Por favor, envíe la *Foto de CI Anverso*.`;
    }
    case "solicitar_documento_foto_ci_re": {
      userStates[sender].current_document = "foto_ci_re";
      return `📷 Por favor, envíe la *Foto de CI Reverso*.`;
    }
    case "solicitar_documento_croquis": {
      userStates[sender].current_document = "croquis";
      return `📐 Por favor, envíe el *Croquis*.`;
    }
    case "solicitar_documento_boleta_pago1": {
      userStates[sender].current_document = "boleta_pago1";
      return `💰 Por favor, envíe la *Boleta de Pago 1*.`;
    }
    case "solicitar_documento_boleta_pago2": {
      userStates[sender].current_document = "boleta_pago2";
      return `💰 Por favor, envíe la *Boleta de Pago 2*.`;
    }
    case "solicitar_documento_boleta_pago3": {
      userStates[sender].current_document = "boleta_pago3";
      return `💰 Por favor, envíe la *Boleta de Pago 3*.`;
    }
    case "solicitar_documento_factura": {
      userStates[sender].current_document = "factura";
      return `📄 Por favor, envíe la *Factura de Luz, Agua o Gas*.`;
    }
    case "solicitar_documento_gestora_publica_afp": {
      userStates[sender].current_document = "gestora_publica_afp";
      return `📑 Por favor, envíe la *Gestora Pública AFP* en formato PDF.`;
    }

    // Estado final después de recibir todos los documentos
    case "documentos_recibidos": {
      try {
        // Limpiar archivos temporales después de guardar
        const userTempDir = directoryManager.getPath("temp") + "/" + sender;
        if (fs.existsSync(userTempDir)) {
          fs.rmSync(userTempDir, { recursive: true, force: true });
        }

        // Llamada a la función para guardar los datos de la solicitud
        const saveSuccess = await saveApplicationData(sender, data);

        if (saveSuccess) {
          clearTimeout(userStates[sender].timeout);
          userStates[sender].state = "finished";
          userStates[sender].in_application = false;
          delete userStates[sender].timeout;

          // Enviar mensaje de cierre y reinicio
          const closureMessage = `✅ Todos los documentos han sido recibidos y guardados correctamente. El chatbot se cerrará ahora y se reiniciará en 5 minutos. Por favor, vuelve a contactarnos después de este tiempo.`;
          logConversation(sender, closureMessage, "bot");

          // Enviar mensaje al usuario
          // Aquí, necesitarás una instancia de `sock`. Como la función está dentro del flujo del trámite, es mejor pasar `sock` como parámetro o manejarlo de otra manera.
          // Para simplificar, asumiremos que tienes acceso a `sock` aquí.
          // Puedes modificar la función para pasar `sock` si es necesario.
          // Por ahora, enviaremos el mensaje desde el flujo principal.

          // Programar el reinicio del estado después de 5 minutos
          setTimeout(() => {
            resetUserState(userStates, sender);
            console.log(
              `Estado de usuario ${sender} reiniciado después de 5 minutos.`
            );
          }, 1 * 60 * 1000); // 5 minutos

          return closureMessage;
        } else {
          // Manejo de error en el guardado
          return `❌ Hubo un error al guardar tu solicitud. Por favor, intenta nuevamente o contacta con soporte técnico.`;
        }
      } catch (error) {
        console.error("Error al guardar la solicitud:", error);
        return `❌ Ocurrió un error inesperado al procesar tu solicitud. Por favor, intenta nuevamente o contacta con soporte técnico.`;
      }
    }

    default: {
      // Correcciones en cascada
      if (state.startsWith("correccion_")) return
      // Si llegó aquí es un estado desconocido
      return `Ha ocurrido un error inesperado, intente de nuevo o escriba 'cancelar'.`;
    }
  }
}

// ------------ FUNCIÓN PARA GENERAR RESPUESTA (Gemini) -----------
export const generateResponse = async (intent, userMessage, sender, prompts, userStates) => {

  // Mapeo de intenciones a handlers
  const responseHandlers = {
    saludo: () => getRandomVariation(prompts.saludo),
    despedida: () => getRandomVariation(prompts.despedida),
    prestamos: () => getRandomVariation(prompts.prestamos),
    informacion_general: () => getRandomVariation(prompts.informacion_general),
    sucursales_horarios: () => prompts.sucursales_horarios.content,
    servicios_ofrecidos: () => getRandomVariation(prompts.servicios_ofrecidos),
    tramite_virtual: () => handleVirtualApplication(sender, userMessage),
    requisitos: () => getRandomVariation(prompts.requisitos),
    informacion_prestamos_asalariados: () => getRandomVariation(prompts.informacion_prestamos_asalariados),
    informacion_prestamos_no_asalariados: () => {
      const content = prompts.informacion_prestamos_no_asalariados.content || "";
      const sucursales = prompts.sucursales_horarios.content || "";
      return content.replace('{{sucursales_y_horarios}}', sucursales);
    },
    requisitos_tramite: () => getRandomVariation(prompts.requisitos_tramite),
    chatbot: () => getRandomVariation(prompts.chatbot),
    cancelar: () => handleCancel(sender)
  };

  // Obtener el handler o usar el default
  const handler = responseHandlers[intent] ||
    (() => getRandomVariation(prompts.otra_informacion));

  let baseResponse = handler();
  // Añadir menú si no está en proceso de trámite
  if (!userStates[sender]) baseResponse = `${baseResponse}\n${contentMenu}`;
  const { in_application, state } = userStates[sender] || {};
  if (!in_application && state === "finished") {
    baseResponse = `${baseResponse}\n${contentMenu}`;
  }

  return baseResponse;
}

// ------------ FUNCIÓN PARA MANEJAR LA CANCELACIÓN -----------
async function handleCancel(sender) {
  if (!userStates[sender]) return `${messageNotTrained} \n\n${contentMenu}`;

  const { cancelAttempts } = userStates[sender];

  if (cancelAttempts) userStates[sender].cancelAttempts = 0;
  userStates[sender].cancelAttempts += 1;
  if (cancelAttempts > MAX_CANCEL_ATTEMPTS) return messageCancel;
  userStates[sender].timeout
  resetUserState(sender, messageCancelSuccess);

  return `${messageCancelFull} \n\n${contentMenu}`;
}

// ------------ FUNCIÓN CENTRALIZADA PARA MANEJO DE MENSAJES -----------
export const handleUserMessage = async (sender, message) => {
  const intent = await classifyIntent(message);
  const respuesta = await generateResponse(intent, message, sender);
  logConversation(sender, message, "usuario");
  logConversation(sender, respuesta, "bot");
  return respuesta;
}

// ------------ MANEJO DEL FLUJO DEL TRÁMITE VIRTUAL -----------
export const handleVirtualApplication = async (sender, userMessage, userStates, prompts) => {
  // Si NO está en trámite, inicializamos
  if (!isInApplicationProcess(userStates, sender)) {
    userStates[sender] = {
      state: "verificar_asalariado",
      data: new ApplicationData(),
      in_application: true,
      cancelAttempts: 0, // Inicializar contador de cancelaciones
      timeout: setTimeout(() => {
        userStates[sender].state = "finished";
        userStates[sender].in_application = false;
        delete userStates[sender].timeout;
      }, 30 * 60 * 1000), // 30 minutos de inactividad
    };
    return `${getRandomVariation(prompts["tramite_virtual"])} (Responda Sí o No)`;
  } else {
    // Continúa en el flujo
    return await continueVirtualApplication(
      userStates[sender].state,
      userStates[sender].data,
      sender,
      userMessage
    );
  }
}

