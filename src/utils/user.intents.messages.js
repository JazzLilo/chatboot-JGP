import {  MAX_RETRIES } from '../utils/constant.js'
import { userStateExededRetryLimit } from '../controllers/user.state.controller.js';
export const userBanedMessage = (userId) => {
}

export const userRetryMessage = (userStates, sender ,retry_message) => {
    
    userStates[sender].retries = (userStates[sender].retries || 0) + 1;

    if (userStates[sender].retries >= MAX_RETRIES) {
        console.log(`Usuario ${sender} ha alcanzado el límite de intentos.`);
        userStateExededRetryLimit(userStates, sender);
        return `❌ Has alcanzado el límite de intentos. Por favor, intenta nuevamente en unos minutos.`;
    }
    else {
        return `${retry_message} Intentos: ${userStates[sender].retries}/3`;
    }
}

export const userIntentDocumentMessage = (userStates, sender) => {
    userStates[sender].intents = (userStates[sender].intents || 0) + 1;
    console.log(`Intentos del usuario ${sender}: ${userStates[sender].intents}`);
    userStateExededRetryLimit(userStates, sender);
    return `❌ Has alcanzado el límite de intentos. Por favor, intenta nuevamente en unos minutos.`;
}