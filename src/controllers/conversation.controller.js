import { MAX_CANCEL_ATTEMPTS, MAX_RETRIES } from '../utils/constant.js'
import {  classifyYesNo, getRandomVariation } from '../config/utils.js';
import { userStateVerifyAsalariado, userStateBaned, resetUserState, userStateExededRetryLimit } from '../controllers/user.state.controller.js';
import { validateEmail, isInApplicationProcess } from '../utils/validate.js';

import directoryManager from '../config/directory.js';
import { saveApplicationData } from '../controllers/user.data.controller.js';
import { logConversation } from '../utils/logger.js'
import { classifyIntent } from '../controllers/gemini.controller.js';
import fs from "fs";
import { contentMenu, messageCancel, messageCancelFull, messageCancelSuccess, messageNotTrained, messageMaxRetry } from '../utils/message.js';
import {
  getDocumentPrompt,
} from '../utils/conversation.prompts.js';

import { getLatLongFromLink } from '../controllers/gemini.controller.js'


import { map } from '../utils/prompt.js';
import { getDocumentState, documentsFlow } from '../utils/document.flow.js'

import { userRetryMessage } from './user.messages.controller.js';

import {MIN_MONTO, MIN_PLAZO, MAX_MONTO, MAX_PLAZO, showVerification, showValidationCuota,showOptionsDeuda } from '../utils/tramite.constant.js';
import {parseCurrency, validateRange, processCapacityEvaluation, calculateMonthlyFee, calculateCapacidad, calculateMaxLoanAmount} from '../utils/tramite.helppers.js';




export const continueVirtualApplication = async (state, data, sender, userMessage, userStates, prompts) => {
  if (userStates[sender].cancelAttempts >= MAX_CANCEL_ATTEMPTS) {
    console.log(`Usuario ${sender} ha alcanzado el límite de intentos de cancelación.`);
    userStateBaned(userStates, sender);

    return `❌ Has alcanzado el límite de intentos de cancelación. Intenta nuevamente en unos minutos.`;
  }
  // preguntar si es objeto
  if (typeof userMessage != "object") {
    // Permite cancelar en cualquier momento
    if (userMessage.toLowerCase().includes("cancelar")) {
      handleCancel(sender, userStates)

      console.log('Cancelación exitosa', userStates);
      return `✅ Has cancelado tu solicitud. Puedes iniciar nuevamente el trámite en cualquier momento.\n\n${contentMenu}`;
    }
  }

  // Verifica si el usuario está en el flujo de documentos
  if (state.startsWith('solicitar_documento_')) {
    const key = state.replace('solicitar_documento_', '');
    userStates[sender].current_document = key;
    return getDocumentPrompt(key);
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
        userStates[sender].retries = 0;
        return message ? `${message}\n\n` : `${contentMenu}`;
      } else {
        return userRetryMessage(userStates, sender, `❓ Responda Sí✔️ o No❌.`);
      }
    }
    case "nombre": {
      const nombre = userMessage.trim();
      const esnombreValida = /^[a-zA-ZÁÉÍÓÚÑáéíóúñ0-9\s]{5,}$/g.test(nombre) &&
        /\D/.test(nombre);
      if (!esnombreValida) return userRetryMessage(userStates, sender, `❌ Nombre no válido. Intente de nuevo. `);
      data.nombre_completo = userMessage.trim();
      userStates[sender].state = "cedula";
      userStates[sender].retries = 0;
      return `Perfecto, ${data.nombre_completo}.\nAhora, ingrese su numero de ci (ej: 123456):`;
    }
    case "cedula": {
      if (!/^\d+$/.test(userMessage) || userMessage.length < 5) {
        return userRetryMessage(userStates, sender, `❌ Cédula no válida. Intente de nuevo:`);
      }
      data.cedula = userMessage;
      userStates[sender].state = "direccion";
      userStates[sender].retries = 0;
      return `Ahora, ingrese su dirección:`;
    }
    case "direccion": {
      const direccion = userMessage.trim();
      const esDireccionValida = /^[a-zA-ZÁÉÍÓÚÑáéíóúñ0-9\s]{3,}$/g.test(direccion) &&
        /\D/.test(direccion);
      if (!esDireccionValida) {
        return userRetryMessage(userStates, sender, `❌ Dirección no válida. Por favor, ingresa una zona o barrio.`);
      }
      data.direccion = direccion;
      userStates[sender].direccion = direccion;
      userStates[sender].state = "enlace_maps";
      return "📍 Gracias. Si deseas, puedes compartir tu ubicación (o escribe *omitir* para continuar sin ella):";
    }
    case "enlace_maps": {
      const location = userMessage;
      if (typeof userMessage != "object") {
        if (userMessage.toLowerCase() === "omitir") {
          data.latitud = 0;
          data.longitud = 0;
          userStates[sender].latitud = 0;
          userStates[sender].longitud = 0;
          userStates[sender].state = "email";
          return "Ubicación omitida. Perfecto, ahora ingrese su email:";
        }
      }

      if (location) {
        const { degreesLatitude, degreesLongitude } = location;
        data.latitud = degreesLatitude;
        data.longitud = degreesLongitude;
        userStates[sender].latitud = degreesLatitude;
        userStates[sender].longitud = degreesLongitude;
        console.log("Ubicación recibida:", userStates[sender].latitud, userStates[sender].longitud);
        userStates[sender].state = "email";
        return "📍 Ubicación recibida correctamente. Ahora ingrese su email:";
      }

      // Si no es ubicación ni 'omitir', se asume que es un enlace
      const coords = await getLatLongFromLink(userMessage);
      if (!coords) {
        return "❌ Enlace no válido o no se pudo extraer coordenadas. Intente de nuevo:";
      }

      userStates[sender].latitud = coords.latitude;
      userStates[sender].longitud = coords.longitude;
      userStates[id].state = "email";
      return "Perfecto, ahora ingrese su email:";
    }
    case "email": {
      if (!validateEmail(userMessage)) {
        return userRetryMessage(userStates, sender, `❌ Email no válido. Intente de nuevo:`);
      }
      data.email = userMessage.trim();
      userStates[sender].state = "monto";
      userStates[sender].retries = 0;
      return `Ahora, ingrese el monto solicitado (ej: 5000):`;
    } 
    case "monto": {
      const val = parseCurrency(userMessage);
      const MIN_MONTO = 1000;
      const MAX_MONTO = data.max_loan_amount || 100000;

      if (!validateRange(val, MIN_MONTO, MAX_MONTO)) {
        return userRetryMessage(
          userStates,
          sender,
          `❌ Monto inválido. Ingrese entre ${MIN_MONTO.toLocaleString()} y ${MAX_MONTO.toLocaleString()} Bs`
        );
      }

      data.monto = val;
      userStates[sender].state = "plazo";
      userStates[sender].retries = 0;

      // Mantenemos el flag adjustmentFlow si existe
      return `Ingrese el nuevo plazo en meses (6-24):`;
    }
    case "plazo": {
      const meses = parseInt(userMessage);
      const MIN_PLAZO = 6;
      const MAX_PLAZO = data.allow_extended_term ? 24 : 12;

      if (!validateRange(meses, MIN_PLAZO, MAX_PLAZO)) {
        return userRetryMessage(
          userStates,
          sender,
          `❌ Plazo inválido. Ingrese entre ${MIN_PLAZO} y ${MAX_PLAZO} meses`
        );
      }

      data.plazo_meses = meses;
      data.cuota_mensual = calculateMonthlyFee(data.monto, meses) || 0;
      console.log("----------------->",userStates[sender].adjustmentFlow)
      // Redirección inteligente según contexto
      if (userStates[sender].adjustmentFlow == 'monto' ) { 
        userStates[sender].state = "monto_pago_deuda";
        delete data.adjustmentFlow;
      } else {
        userStates[sender].state = "sueldo";
      }

      return data.adjustmentFlow
        ? `Plazo actualizado. Recalculando...`
        : `¿Cuál es su sueldo mensual neto?`;
    }
    case "sueldo": {
      data.sueldo = parseCurrency(userMessage);
      userStates[sender].state = "ingreso_extra";
      return `¿Recibe ingresos adicionales? (Sí/No)`;
    }
    case "ingreso_extra": {
      switch (classifyYesNo(userMessage)) {
        case true:
          userStates[sender].state = "ingreso_extra_monto";
          return `Indique el monto de ingresos adicionales mensuales:`;
        case false:
          userStates[sender].state = "deuda";
          return `¿Tiene deudas financieras? (Sí/No)`;
        default:
          return `❌ Responda Sí o No`;
      }
    }
    case "ingreso_extra_monto": {
      const val = parseCurrency(userMessage);
      const MIN_MONTO = 0;
      const MAX_MONTO = 100000;
      if (!validateRange(val, MIN_MONTO, MAX_MONTO)) {
        return userRetryMessage(
          userStates,
          sender,
          `❌ Monto inválido. Ingrese entre ${MIN_MONTO.toLocaleString()} y ${MAX_MONTO.toLocaleString()} Bs`
        )
      }
      data.ingreso_extra = val;
      userStates[sender].state = "deuda";
      return `¿Tiene deudas financieras? (Sí/No)`;
    }
    case "deuda": {
      switch (classifyYesNo(userMessage)) {
        case true:
          userStates[sender].state = "monto_pago_deuda";
          return `Ingrese el total mensual que paga por sus deudas:`;
        case false:
          return processCapacityEvaluation(data, userStates, sender);
        default:
          return `❌ Responda Sí o No`;
      }
    }
    case "monto_pago_deuda": {
      data.monto_pago_deuda = parseCurrency(userMessage);
      return processCapacityEvaluation(data, userStates, sender);
    }
    case "select_option_deuda": {
      const option = parseInt(userMessage);
      switch (option) {
        case 1:
          userStates[sender].adjustmentFlow = 'monto'; // Bandera para flujo de ajuste
          userStates[sender].state = "monto";
          return `Ingrese nuevo monto (máximo ${data.max_loan_amount.toFixed(2)} Bs):`;

        case 2:
          userStates[sender].adjustmentFlow = 'plazo'; // Bandera para flujo de ajuste
          userStates[sender].state = "plazo";
          return `Ingrese nuevo plazo (6-24 meses):`;

        case 3:
          userStates[sender].state = "INIT";
          return `Visite nuestras oficinas para más opciones. ¿Necesita algo más?\n${contentMenu}`;

        default:
          const capacidad = calculateCapacidad(data);
          const maxLoan = calculateMaxLoanAmount(capacidad, data.plazo_meses);
          return userRetryMessage(userStates, sender, showOptionsDeuda(data, capacidad, maxLoan));
      }
    }

    case "verificacion": {
      const resp = classifyYesNo(userMessage);
      if (resp === true) {
        // Crear directorio temporal si no existe
        const userTempDir = directoryManager.getPath("temp") + "/" + sender;
        fs.mkdirSync(userTempDir, { recursive: true });

        const firstKey = documentsFlow[0].key;
        userStates[sender].state = getDocumentState(firstKey);
        userStates[sender].current_document = firstKey;
        userStates[sender].retries = 0;
        return getDocumentPrompt(firstKey);
      } else if (resp === false) {
        userStates[sender].state = "correccion";
        userStates[sender].retries = 0;
        return `🔄 ¿Qué dato deseas corregir?\n1️⃣ Nombre\n2️⃣ Cédula\n3️⃣ Dirección\n4️⃣ Email\n5️⃣ Monto\n6️⃣ Plazo\n(Escribe el número de la opción o 'cancelar' para terminar.)`;
      } else {
        return `❓ Responda Sí✔️ o No❌.`;
      }
    }
    case "correccion": {
      const opcion = parseInt(userMessage);
      if (![1, 2, 3, 4, 5, 6, 7].includes(opcion)) {
        return userRetryMessage(userStates, sender, `❌ Opción no válida, intente de nuevo:`);
      }

      userStates[sender].state = map[opcion];
      return `Ingrese el nuevo valor (o 'cancelar' para terminar):`;
    }


    // Manejo de estados para correcciones
    case "correccion_nombre":
    case "correccion_cedula":
    case "correccion_direccion":
    case "correccion_enlace_maps":
    case "correccion_email":
    case "correccion_monto":
    case "correccion_plazo": {
      const field = state.split("_")[1];
      console.log(`Estado de Corrección: ${state}, Campo a corregir: ${field}`);

      switch (field) {
        case "nombre":
          if (!userMessage.trim())
            return userRetryMessage(userStates, sender, `❌ Nombre inválido, intente de nuevo:`);
          data.nombre_completo = userMessage.trim();
          break;
        case "cedula":
          if (!/^\d+$/.test(userMessage) || userMessage.length < 5)
            return userRetryMessage(userStates, sender, `❌ Cédula no válida:`);
          data.cedula = userMessage;
          break;
        case "direccion":
          if (!userMessage.trim()) return userRetryMessage(userStates, sender, `❌ Dirección no válida:`);
          data.direccion = userMessage.trim();
          break;
        case "enlace_maps":
          const location = userMessage;
          if (typeof userMessage != "object") {
            if (userMessage.toLowerCase() === "omitir") {
              userStates[sender].latitud = 0;
              userStates[sender].longitud = 0;
              break
            }
          }
          if (location) {
            const { degreesLatitude, degreesLongitude } = location;
            userStates[sender].latitud = degreesLatitude;
            userStates[sender].longitud = degreesLongitude;
            console.log("Ubicación recibida:", userStates[sender].latitud, userStates[sender].longitud);
            break
          }

          // Si no es ubicación ni 'omitir', se asume que es un enlace
          const coords = await getLatLongFromLink(userMessage);
          if (!coords) {
            return "❌ Enlace no válido o no se pudo extraer coordenadas. Intente de nuevo:";
          }

          userStates[sender].latitud = coords.latitude;
          userStates[sender].longitud = coords.longitude;
          break;
        case "email":
          if (!validateEmail()) return userRetryMessage(userStates, sender, `❌ Email no válido:`);
          data.email = userMessage.trim();
          break;
        case "monto":
          const val = parseFloat(userMessage.replace(/[^0-9.]/g, ""));
          if (isNaN(val) || val < 1000 || val > 100000)
            return userRetryMessage(userStates, sender, `❌ Monto no válido. Por favor, ingrese un monto entre 1,000 y 100,000. Ejemplo: 5000 o 15,000.`);
          data.monto = val;
          data.cuota_mensual = calculateMonthlyFee(
            data.monto,
            data.plazo_mensual
          );
          break;
        case "plazo":
          const meses = parseInt(userMessage);
          if (isNaN(meses) || meses < 1 || meses > 24)
            return userRetryMessage(userStates, sender, `❌ Plazo no válido. Intente de nuevo:`);
          data.plazo_mensual = meses;
          data.cuota_mensual = calculateMonthlyFee(data.monto, meses);
          break;
        default:
          return userRetryMessage(userStates, sender, `❌ Campo desconocido. Intente de nuevo:`);
      }

      userStates[sender].state = "verificacion";
      return `${showVerification(data)}`;
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
          }, 5 * 60 * 1000); // 5 minutos

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

  const responseHandlers = {
    saludo: () => getRandomVariation(prompts.saludo),
    despedida: () => getRandomVariation(prompts.despedida),
    prestamos: async () => await handleVirtualApplication(sender, userMessage, userStates, prompts),
    informacion_general: () => getRandomVariation(prompts.informacion_general),
    sucursales_horarios: () => prompts.sucursales_horarios.content,
    servicios_ofrecidos: () => getRandomVariation(prompts.servicios_ofrecidos),
    tramite_virtual: async () => await handleVirtualApplication(sender, userMessage, userStates, prompts),
    requisitos: () => getRandomVariation(prompts.requisitos),
    informacion_prestamos_no_asalariados: () => {
      const content = prompts.informacion_prestamos_no_asalariados.content || "";
      const sucursales = prompts.sucursales_horarios.content || "";
      return content.replace('{{sucursales_y_horarios}}', sucursales);
    },
    requisitos_tramite: () => getRandomVariation(prompts.requisitos_tramite),
    chatbot: () => getRandomVariation(prompts.chatbot),
    cancelar: () => handleCancel(sender, userStates)
  };
  const getResponse = responseHandlers[intent] || (() => getRandomVariation(prompts.otra_informacion));
  const { state } = userStates[sender] || {};
  const inProcess = await isInApplicationProcess(userStates, sender);


  const response = await getResponse();
  console.log(`Intento: ${intent}, Respuesta: ${response}, Estado: ${state}, En Proceso: ${inProcess}`);

  let finalResponse = response;
  if (intent === "despedida") {
    return finalResponse
  }
  if (!inProcess && state !== "finished") {
    finalResponse += `\n${contentMenu}`;
  }

  if (!inProcess && state === "baned") {
    finalResponse += `\n${messageCancelFull}`;
  }

  if (state === "limit_retries") {
    return `${messageMaxRetry}`;
  }

  return finalResponse;
};

// ------------ FUNCIÓN PARA MANEJAR LA CANCELACIÓN -----------
export const handleCancel = async (sender, userStates) => {
  console.log(`Manejo de cancelación para el usuario: ${sender}`);
  if (!userStates[sender]) return `${messageNotTrained} \n\n${contentMenu}`;

  const { cancelAttempts } = userStates[sender];

  console.log(`Intentos de cancelación: ${cancelAttempts}`);
  //if (cancelAttempts) userStates[sender].cancelAttempts = 0;
  const cancel_count_temp = userStates[sender].cancelAttempts += 1;
  if (cancelAttempts > MAX_CANCEL_ATTEMPTS) return messageCancel;
  userStates[sender].timeout
  resetUserState(userStates, sender, messageCancelSuccess);
  userStates[sender].cancelAttempts = cancel_count_temp;
  console.log(`Estado de usuario ${sender} reiniciado después de ${MAX_CANCEL_ATTEMPTS} intentos de cancelación, cantidad de intentos ${userStates[sender].cancelAttempts}.`);
  return `${messageCancelFull} \n\n${contentMenu}`;
}

// ------------ FUNCIÓN CENTRALIZADA PARA MANEJO DE MENSAJES -----------
export const handleUserMessage = async (sender, message, prompts, userStates) => {
  const intent = await classifyIntent(message);
  const respuesta = await generateResponse(intent, message, sender, prompts, userStates);
  console.log(`Intento: ${intent}, Respuesta: ${respuesta}`);
  logConversation(sender, message, "usuario");
  logConversation(sender, respuesta, "bot");
  return respuesta;
}

// ------------ MANEJO DEL FLUJO DEL TRÁMITE VIRTUAL -----------
export const handleVirtualApplication = async (sender, userMessage, userStates, prompts) => {
  // Si NO está en trámite, inicializamos
  if (!isInApplicationProcess(sender)) {
    userStateVerifyAsalariado(userStates, sender);
    return `${getRandomVariation(
      prompts["tramite_virtual"]
    )} (Responda Sí o No)`;
  } else {
    // Continúa en el flujo
    console.log(`El usuario ${sender} ya está en trámite, continuando...`);
    return await continueVirtualApplication(
      userStates[sender].state,
      userStates[sender].data,
      sender,
      userMessage
    );
  }
}

