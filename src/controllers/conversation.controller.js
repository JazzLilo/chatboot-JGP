import { MAX_CANCEL_ATTEMPTS } from '../utils/constant.js'
import { getRandomVariation } from '../config/utils.js';
import { userStateVerifyAsalariado, userStateBaned, resetUserState } from '../controllers/user.state.controller.js';
import { isInApplicationProcess } from '../utils/validate.js';

import { logConversation } from '../utils/logger.js'
import { classifyIntent } from '../controllers/gemini.controller.js';

import { contentMenu, messageCancel, messageCancelFull, messageCancelSuccess, messageNotTrained, messageMaxRetry } from '../utils/message.js';



import {
  handleInitialChecks,
  handleStateFlow,
  handleCorrections
} from '../controllers/tramite.controller.js';

export const continueVirtualApplication = async (state, data, sender, userMessage, userStates, prompts) => {
  // Límite de cancelaciones
  if (userStates[sender].cancelAttempts >= MAX_CANCEL_ATTEMPTS) {
    console.log(`Usuario ${sender} ha alcanzado el límite de intentos de cancelación.`);
    userStateBaned(userStates, sender);
    return `❌ Has alcanzado el límite de intentos de cancelación. Intenta nuevamente en unos minutos.`;
  }

  const cancelHandled = handleInitialChecks(userMessage, sender, userStates);
  if (cancelHandled) return cancelHandled;

  if (state.startsWith("correccion")) {
    return handleCorrections(state, sender, userMessage, userStates, data);
  }

  return handleStateFlow(state, data, sender, userMessage, userStates, prompts);
};


// ------------ FUNCIÓN PARA GENERAR RESPUESTA (Gemini) -----------
export const generateResponse = async (intent, userMessage, sender, prompts, userStates) => {
  const userState = userStates[sender]?.state || "";
  const inProcess = await isInApplicationProcess(userStates, sender);

  const staticResponse = (key) => () => getRandomVariation(prompts[key] || {});
  const fixedContent = (key) => () => prompts[key]?.content || "";

  const responseHandlers = {
    saludo: staticResponse("saludo"),
    despedida: staticResponse("despedida"),
    chatbot: staticResponse("chatbot"),
    requisitos: staticResponse("requisitos"),
    servicios_ofrecidos: staticResponse("servicios_ofrecidos"),
    informacion_general: staticResponse("informacion_general"),
    requisitos_tramite: staticResponse("requisitos_tramite"),
    sucursales_horarios: fixedContent("sucursales_horarios"),

    tramite_virtual: () => handleVirtualApplication(sender, userMessage, userStates, prompts),
    prestamos: () => handleVirtualApplication(sender, userMessage, userStates, prompts),

    informacion_prestamos_no_asalariados: () => {
      const info = prompts.informacion_prestamos_no_asalariados?.content || "";
      const sucursales = prompts.sucursales_horarios?.content || "";
      return info.replace('{{sucursales_y_horarios}}', sucursales);
    },

    cancelar: () => handleCancel(sender, userStates)
  };

  const handler = responseHandlers[intent] || staticResponse("otra_informacion");

  const baseResponse = await handler();

  console.log(`Intento: ${intent}, Respuesta: ${baseResponse}, Estado: ${userState}, En Proceso: ${inProcess}`);

  // Casos especiales
  if (intent === "despedida") return baseResponse;
  if (userState === "limit_retries") return messageMaxRetry;

  let finalResponse = baseResponse;

  if (!inProcess && userState !== "finished") {
    finalResponse += `\n${contentMenu}`;
  }

  if (!inProcess && userState === "baned") {
    finalResponse += `\n${messageCancelFull}`;
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

