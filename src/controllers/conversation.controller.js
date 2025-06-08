import { MAX_CANCEL_ATTEMPTS } from '../utils/constant.js'
import { classifyYesNo, getRandomVariation } from '../config/utils.js';
import { userStateVerifyAsalariado, userStateBaned, resetUserState } from '../controllers/user.state.controller.js';
import { isInApplicationProcess } from '../utils/validate.js';
import directoryManager from '../config/directory.js';
import { saveApplicationData } from '../controllers/user.data.controller.js';
import { logConversation } from '../utils/logger.js'
import { classifyIntent } from '../controllers/gemini.controller.js';
import fs from "fs";
import { contentMenu, messageCancel, messageCancelFull, messageCancelSuccess, messageNotTrained, messageMaxRetry } from '../utils/message.js';
import { getDocumentState, documentsFlow, getDocumentMessage } from '../utils/document.flow.js'
import { userRetryMessage } from './user.messages.controller.js';
import { showOptionsDeuda, CORRECTION_MAP, MAX_MONTO, MIN_PLAZO, showDontGetTramite } from '../utils/tramite.constant.js';
import { parseCurrency, processCapacityEvaluation, processCapacityEvaluationFamiliar, calculateCapacidad, calculateMaxLoanAmount } from '../utils/tramite.helppers.js';

import { getTramitePrompt, handleTextInput, handleLocationInput, handleNumberInput, handlePlazoInput } from '../utils/tramite.flow.js'
import { get } from 'http';


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
    return getDocumentMessage(key);
  }

  switch (state) {
    case "verificar_asalariado": {
      const respuesta = classifyYesNo(userMessage);
      if (respuesta === true) {
        data.es_asalariado = true;
        userStates[sender].in_data_charge = true;
        userStates[sender].state = "documento_custodia";
        userStates[sender].retries = 0;
        return getTramitePrompt("documento_custodia");
      } else if (respuesta === false) {
        const message = `❌ Lo sentimos, por ahora solo prestamos para asalariados. Aquí tienes más información:\n\n${getRandomVariation(prompts["requisitos"])}`;
        userStates[sender].state = "INIT";
        userStates[sender].retries = 0;
        userStates[sender].in_application = false;
        return `${message}\n\n${contentMenu}`;
      } else {
        return userRetryMessage(userStates, sender, `❓ Responda Sí✔️ o No❌.`);
      }
    }
    case "documento_custodia": {
      switch (classifyYesNo(userMessage)) {
        case true:
          userStates[sender].state = "nombre_completo";
          return getTramitePrompt("nombre_completo");
        case false:
          resetUserState(userStates, sender);
          return `❌ Lo sentimos, Usted debe contar con un documento en custodia para iniciar el trámite. Puede pasarse por nuestras Sucursales.\n\n ${contentMenu}`;
        default:
          return `❌ Responda Sí o No`;
      }
    }
    case "nombre_completo": {
      return handleTextInput(userStates, sender, data, "nombre_completo", "cedula", userMessage.trim());
    }
    case "cedula": {
      return handleTextInput(userStates, sender, data, "cedula", "direccion", userMessage.trim());
    }
    case "direccion": {
      return handleTextInput(userStates, sender, data, "direccion", "enlace_maps", userMessage.trim());
    }
    case "enlace_maps": {
      return handleLocationInput(userStates, sender, data, "enlace_maps", "email", userMessage);
    }
    case "email": {
      return handleTextInput(userStates, sender, data, "email", "monto", userMessage.trim());
    }
    case "monto": {
      const val = parseCurrency(userMessage);
      const MIN_MONTO = 0;
      const MX_MONTO = data.max_loan_amount ? data.max_loan_amount : MAX_MONTO; // Usar constante global

      return handleNumberInput(userStates, sender, data, "monto", "plazo_meses", val, MIN_MONTO, MX_MONTO);
    }
    case "plazo_meses": {
      const meses = parseCurrency(userMessage);
      const MIN_PLAZO = 6;
      const MAX_PLAZO = data.allow_extended_term ? 12 : 12;

      return handlePlazoInput(userStates, sender, data, "plazo_meses", "rubro", meses, MIN_PLAZO, MAX_PLAZO);
    }
    case "rubro": {
      return handleTextInput(userStates, sender, data, "rubro", "sueldo", userMessage.trim());
    }
    case "sueldo": {
      const val = parseCurrency(userMessage);
      const MIN_SUELDO = 0;
      const MAX_SUELDO = 1000000;
      return handleNumberInput(userStates, sender, data, "sueldo", "deuda", val, MIN_SUELDO, MAX_SUELDO);
    }
    case "deuda": {
      switch (classifyYesNo(userMessage)) {
        case true:
          userStates[sender].state = "cantidad_deuda";
          return getTramitePrompt("cantidad_deuda");
        case false:
          return processCapacityEvaluation(data, userStates, sender);
        default:
          return `❌ Responda Sí o No`;
      }
    }
    case "cantidad_deuda": {
      const count = parseCurrency(userMessage);
      const MIN_DEUDAS = 0;
      const MAX_DEUDAS = 100;

      return handleNumberInput(userStates, sender, data, "cantidad_deuda", "monto_pago_deuda", count, MIN_DEUDAS, MAX_DEUDAS);
    }
    case "monto_pago_deuda": {
      const amount = parseCurrency(userMessage);
      if (isNaN(amount) || amount < 0) {
        return userRetryMessage(userStates, sender, "❌ Ingrese un monto válido (ej: 1500)");
      }
      data.monto_pago_deuda = amount;
      return processCapacityEvaluation(data, userStates, sender);
    }
    case "familiar_asalariado": {
      switch (classifyYesNo(userMessage)) {
        case true:
          userStates[sender].state = "sueldo_familiar";
          return getTramitePrompt("sueldo_familiar");
        case false:
          userStates[sender].state = "select_option_deuda";
          return showOptionsDeuda(data);
        default:
          return `❌ Responda Sí o No`;
      }
    }
    case "sueldo_familiar": {
      const amount = parseCurrency(userMessage);
      if (isNaN(amount) || amount <= 0) {
        return userRetryMessage(userStates, sender, "❌ Ingrese un monto válido mayor a cero");
      }
      data.ingreso_familiar = amount;
      return processCapacityEvaluationFamiliar(data, userStates, sender);
    }
    case "select_option_deuda": {
      const option = parseCurrency(userMessage);
      switch (option) {
        case 1:
          userStates[sender].adjustmentFlow = 'monto';
          userStates[sender].state = "monto";
          return `Ingrese nuevo monto (máximo ${data.max_loan_amount.toFixed(2)} Bs):`;

        case 2:
          userStates[sender].adjustmentFlow = 'plazo';
          userStates[sender].state = "plazo_meses";
          return `Ingrese nuevo plazo (${MIN_PLAZO}-${MAX_PLAZO} meses):`;

        case 3:
          userStates[sender].state = "INIT";
          return `Visite nuestras oficinas para más opciones.\n ${prompts.sucursales_horarios.content}\n${contentMenu}`;

        default:
          const capacidad = calculateCapacidad(data);
          if (capacidad > 0) {
            return showDontGetTramite();
          }
          const maxLoan = calculateMaxLoanAmount(capacidad, data.plazo_meses);
          return userRetryMessage(userStates, sender, showOptionsDeuda(data, capacidad, maxLoan));
      }
    }
    case "fondos_insuficientes":{
      resetUserState(userStates, sender);
      return "❌ Lo sentimos, no puedes acceder al trámite. Puedes visitar nuestras sucursales para más información.\n\n" + contentMenu;
    }
    case "verificacion": {
      const resp = classifyYesNo(userMessage);
      if (resp === true) {
        const userTempDir = directoryManager.getPath("temp") + "/" + sender;
        fs.mkdirSync(userTempDir, { recursive: true });

        const firstKey = documentsFlow[0].key;
        userStates[sender].state = getDocumentState(firstKey);
        userStates[sender].current_document = firstKey;
        userStates[sender].retries = 0;
        return getDocumentMessage(firstKey);
      } else if (resp === false) {
        userStates[sender].state = "correccion";
        userStates[sender].retries = 0;
        return `🔄 ¿Qué dato deseas corregir?\n1️⃣ Nombre\n2️⃣ Cédula\n3️⃣ Dirección\n4️⃣ Email\n5️⃣Ubicacion Compartida  \n(Escribe el número de la opción o 'cancelar' para terminar.)`;
      } else {
        return `❓ Responda Sí✔️ o No❌.`;
      }
    }
    case "correccion": {
      const opcion = parseCurrency(userMessage);
      if (![1, 2, 3, 4, 5].includes(opcion)) {
        return userRetryMessage(userStates, sender, `❌ Opción no válida. Ingrese un número del 1 al 7:`);
      }
      userStates[sender].state = CORRECTION_MAP[opcion];
      return `✏️ Ingrese el nuevo valor para ${getTramitePrompt(CORRECTION_MAP[opcion].split('-')[1])}:`;
    }

    case "correccion-nombre_completo": {
      return handleTextInput(userStates, sender, data, "nombre_completo", "verificacion", userMessage.trim());
    }

    case "correccion-cedula": {
      return handleTextInput(userStates, sender, data, "cedula", "verificacion", userMessage.trim());
    }

    case "correccion-direccion": {
      return handleTextInput(userStates, sender, data, "direccion", "verificacion", userMessage.trim());
    }

    case "correccion-email": {
      return handleTextInput(userStates, sender, data, "email", "verificacion", userMessage.trim());
    }

    case "correccion-enlace_maps": {
      return handleLocationInput(userStates, sender, data, "enlace_maps", "verificacion", userMessage);
    }
    default: {
      if (state.startsWith("correccion_")) return
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

