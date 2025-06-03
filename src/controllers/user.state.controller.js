import { ApplicationData } from './tratamientoBD.js';
import { MAX_CANCEL_ATTEMPTS } from '../utils/constant.js'
import { contentMenu } from "../utils/message.js";

export const userStateInit = (userStates, id) => {
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
}

export const userStateVerifyAsalariado = (userStates, sender) => {
    const previousCancelAttempts = userStates[sender]?.cancelAttempts || 0;
    const previousRetries = userStates[sender]?.retries || 0;
    const previousIntents = userStates[sender]?.intents || 0;
    userStates[sender] = {
        state: "verificar_asalariado",
        data: new ApplicationData(),
        in_application: true,
        cancelAttempts: previousCancelAttempts, // Inicializar contador de cancelaciones
        retries: previousRetries, // Inicializar contador de reintentos
        intents: previousIntents, // Inicializar contador de intents
        timeout: setTimeout(() => {
            userStates[sender].state = "finished";
            userStates[sender].in_application = false;
            delete userStates[sender].timeout;
        }, 40 * 60 * 1000),
        timeoutFinish: setTimeout(() => {
            userStates[sender].state = "finished";
            userStates[sender].in_application = false;
            delete userStates[sender].timeout;
        }, 40 * 60 * 1000), // 30 minutos de inactividad
        timeoutBan: setTimeout(() => {
            if (userStates[sender].cancelAttempts >= MAX_CANCEL_ATTEMPTS) {
                userStates[sender].state = "baned";
                userStates[sender].in_application = false;
            }
            delete userStates[sender].timeoutBan;
        }, 2 * 60 * 1000),
    };
}

export const userStateBaned = (userStates, sender) => {
    userStates[sender].state = "baned";
    userStates[sender].in_application = false;

    // Limpiar datos antiguos
    delete userStates[sender].timeoutBan;

    // Cambiar estado a 'reen' después de 1 minuto
    setTimeout(() => {
        if (userStates[sender] && userStates[sender].state === "baned") {
            userStates[sender].state = "reen";
            console.log(`⏱ Estado del usuario ${sender} cambiado a 'reen' tras 1 minuto.`);
        }
    }, 1 * 60 * 1000); // 1 minuto

    // Reiniciar estado completamente después de 5 minutos
    setTimeout(() => {
        userStates[sender].cancelAttempts = 0;
        resetUserState(userStates, sender);
        console.log(`🔄 Estado del usuario ${sender} reiniciado tras 1 minutos.`);
    }, 1 * 60 * 1000);

}

export const userStateExededRetryLimit = (userStates, sender) => {
    userStates[sender].state = "limit_retries";
    userStates[sender].in_application = false;
    setTimeout(() => {
        userStates[sender].cancelAttempts = 0;
        userStates[sender].retries = 0;
        userStates[sender].intents = 0;
        resetUserState(userStates, sender);
        console.log(`🔄 Estado del usuario ${sender} reiniciado tras 1 minutos.`);
    }, 1 * 60 * 1000);
    return `Intente`
}

export const resetUserState = (userStates, sender, message = null) => {

    clearTimeout(userStates[sender]?.timeout);
    userStates[sender].state = "INIT";
    userStates[sender].in_application = false;
    delete userStates[sender].timeout;
    delete userStates[sender].retries;
    delete userStates[sender].current_document_index;
    delete userStates[sender].documents_order;
    delete userStates[sender].current_document;
    return message ? `${message}\n\n${contentMenu}` : `${contentMenu}`;
}

export const userStateFinished = (userStates, sender) => {
    clearTimeout(userStates[sender].timeout);
    userStates[sender].state = "finished";
    userStates[sender].in_application = false;
    delete userStates[sender].timeout;
    setTimeout(() => {
        resetUserState(userStates, sender);
        console.log(
            `Estado de usuario ${sender} reiniciado después de 5 minutos.`
        );
    }, 5 * 60 * 1000);
}