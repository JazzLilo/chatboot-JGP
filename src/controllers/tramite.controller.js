
import { classifyYesNo, getRandomVariation } from '../config/utils.js';
import { resetUserState } from '../controllers/user.state.controller.js';
import directoryManager from '../config/directory.js';
import fs from "fs";
import { contentMenu } from '../utils/message.js';
import { getDocumentState, documentsFlow, getDocumentMessage } from '../utils/document.flow.js'
import { userRetryMessage } from '../utils/user.intents.messages.js';
import { showOptionsDeuda, CORRECTION_MAP, MIN_MONTO, MAX_MONTO, MIN_PLAZO, MAX_PLAZO, MIN_SUELDO, MAX_SUELDO, MIN_DEUDAS, MAX_DEUDAS ,showDontGetTramite, showChangeData } from '../utils/tramite.constant.js';
import { processCapacityEvaluation, processCapacityEvaluationFamiliar, handleCancel } from '../utils/tramite.helppers.js';
import { parseCurrency } from '../utils/tramite.validations.js';
import { calculateCapacidad, calculateMaxLoanAmount } from '../utils/tramite.calculations.js';
import { getTramitePrompt, handleTextInput, handleLocationInput, handleNumberInput, handlePlazoInput } from '../utils/tramite.flow.js'
import {messageCancelSuccess, messagePrestamosAsalariado, meesageRespondaSioNo, messageCustodia,messageMontoValido, messageSaldoInsuficiente} from '../utils/message.js';

export const handleInitialChecks = (userMessage, sender, userStates) => {
    if (typeof userMessage !== "object" && userMessage.toLowerCase().includes("cancelar")) {
        handleCancel(sender, userStates);
        return `${messageCancelSuccess}\n\n${contentMenu}`;
    }
    return null;
};


export const handleStateFlow = (state, data, sender, userMessage, userStates, prompts) => {
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
                const message = `${messagePrestamosAsalariado}\n\n${getRandomVariation(prompts["requisitos"])}`;
                userStates[sender].state = "INIT";
                userStates[sender].retries = 0;
                userStates[sender].in_application = false;
                return `${message}\n\n${contentMenu}`;
            } else {
                return userRetryMessage(userStates, sender, `${meesageRespondaSioNo}`);
            }
        }
        case "documento_custodia": {
            switch (classifyYesNo(userMessage)) {
                case true:
                    userStates[sender].state = "nombre_completo";
                    return getTramitePrompt("nombre_completo");
                case false:
                    resetUserState(userStates, sender);
                    return `${messageCustodia}\n\n ${contentMenu}`;
                default:
                    return `${meesageRespondaSioNo}`;
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
            const MX_MONTO = data.max_loan_amount ? data.max_loan_amount : MAX_MONTO; 

            return handleNumberInput(userStates, sender, data, "monto", "plazo_meses", val, MIN_MONTO, MX_MONTO);
        }
        case "plazo_meses": {
            const meses = parseCurrency(userMessage);
            return handlePlazoInput(userStates, sender, data, "plazo_meses", "rubro", meses, MIN_PLAZO, MAX_PLAZO);
        }
        case "rubro": {
            return handleTextInput(userStates, sender, data, "rubro", "sueldo", userMessage.trim());
        }
        case "sueldo": {
            const val = parseCurrency(userMessage);
            
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
                    return `${meesageRespondaSioNo}`;
            }
        }
        case "cantidad_deuda": {
            const count = parseCurrency(userMessage);
            return handleNumberInput(userStates, sender, data, "cantidad_deuda", "monto_pago_deuda", count, MIN_DEUDAS, MAX_DEUDAS);
        }
        case "monto_pago_deuda": {
            const amount = parseCurrency(userMessage);
            if (isNaN(amount) || amount < 0) {
                return userRetryMessage(userStates, sender, messageMontoValido);
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
                    return `${meesageRespondaSioNo}`;
            }
        }
        case "sueldo_familiar": {
            const amount = parseCurrency(userMessage);
            if (isNaN(amount) || amount <= 0) {
                return userRetryMessage(userStates, sender, messageMontoValido);
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
        case "fondos_insuficientes": {
            resetUserState(userStates, sender);
            return messageSaldoInsuficiente+"\n\n" + contentMenu;
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
                return showChangeData();
            } else {
                return `❓ Responda Sí✔️ o No❌.`;
            }
        }
        default:
            return `Ha ocurrido un error inesperado, intente de nuevo o escriba 'cancelar'.`;
    }
};


export const handleCorrections = (state, sender, userMessage, userStates, data) => {
    if (state === "correccion") {
        const opcion = parseCurrency(userMessage);
        if (![1, 2, 3, 4, 5].includes(opcion)) {
            return userRetryMessage(userStates, sender, `❌ Opción no válida. Ingrese un número del 1 al 5:`);
        }
        const nextState = CORRECTION_MAP[opcion];
        userStates[sender].state = nextState;
        return `✏️ Ingrese el nuevo valor para ${getTramitePrompt(nextState.split('-')[1])}:`;
    }

    // Correcciones individuales
    if (state === "correccion-nombre_completo") {
        return handleTextInput(userStates, sender, data, "nombre_completo", "verificacion", userMessage.trim());
    }
    if (state === "correccion-cedula") {
        return handleTextInput(userStates, sender, data, "cedula", "verificacion", userMessage.trim());
    }
    if (state === "correccion-direccion") {
        return handleTextInput(userStates, sender, data, "direccion", "verificacion", userMessage.trim());
    }
    if (state === "correccion-email") {
        return handleTextInput(userStates, sender, data, "email", "verificacion", userMessage.trim());
    }
    if (state === "correccion-enlace_maps") {
        return handleLocationInput(userStates, sender, data, "enlace_maps", "verificacion", userMessage);
    }
    return null;
};
