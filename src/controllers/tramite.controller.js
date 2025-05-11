import {getTramiteStep, getTramitePrompt, validateTramiteInput, getValidationErrorMessage, getNextTramiteKey} from '../utils/tramite.flow.js';
import {logConversation } from '../utils/logger.js';
import {MIN_MONTO, MIN_PLAZO, MAX_MONTO, MAX_PLAZO, showVerification, showValidationCuota,showOptionsDeuda } from '../utils/tramite.constant.js';
import {parseCurrency, validateRange, processCapacityEvaluation, calculateMonthlyFee, calculateCapacidad, calculateMaxLoanAmount} from '../utils/tramite.helppers.js';
import { userRetryMessage } from '../controllers/user.messages.controller.js';
import { getLatLongFromLink } from '../controllers/gemini.controller.js'
import { classifyYesNo } from '../config/utils.js';
export const tramiteIngress = async (userStates, sender, mensaje, sock) => {
    try {
        console.log(`Mensaje recibido de ${sender}: ${mensaje}`);
        const state = userStates[sender].state;
        const data = userStates[sender].data || {};
        let response;

        // Verificar si es un estado del flujo principal
        const currentStep = getTramiteStep(state);
        console.log(`Estado actual: ${state}`);
        if (currentStep) {
            console.log(`Paso actual: ${currentStep.key}`);
            // Validación genérica para todos los pasos
            if (!validateTramiteInput(state, mensaje, data.max_loan_amount || 0)) {
                return userRetryMessage(
                    userStates, 
                    sender, 
                    getValidationErrorMessage(state)
                );
            }

            // Procesamiento especial para ciertos pasos
            switch(state) {
                case 'enlace_maps':
                    if (mensaje.toLowerCase() === 'omitir') {
                        data.latitud = 0;
                        data.longitud = 0;
                    } else {
                        const coords = await getLatLongFromLink(mensaje);
                        if (!coords) {
                            return userRetryMessage(userStates, sender, '❌ Enlace inválido');
                        }
                        data.latitud = coords.latitude;
                        data.longitud = coords.longitude;
                    }
                    break;
                    
                case 'monto':
                    data.monto = parseCurrency(mensaje);
                    // Calcular máximo permitido si es necesario
                    if (!data.max_loan_amount) {
                        data.max_loan_amount = calculateMaxLoanAmount(data);
                    }
                    break;
                    
                case 'plazo_en_meses':
                    data.plazo_en_meses = parseInt(mensaje);
                    data.cuota_mensual = calculateMonthlyFee(data.monto, data.plazo_en_meses);
                    break;
                    
                case 'ingreso_extra':
                    data.ingreso_extra = classifyYesNo(mensaje) ? true : false;
                    break;
                    
                case 'deuda':
                    data.deuda = classifyYesNo(mensaje) ? true : false;
                    break;
                    
                default:
                    // Almacenamiento genérico de datos
                    data[state] = mensaje.trim();
            }

            // Obtener siguiente paso considerando condiciones de salto
            const nextState = getNextTramiteKey(state, data);
            
            if (nextState) {
                userStates[sender].state = nextState;
                response = getTramitePrompt(nextState);
                
                // Manejar lógica post-paso
                if (nextState === 'verificacion') {
                    response = showVerification(data);
                }
            } else {
                // Fin del flujo
                response = '✅ Trámite completado exitosamente';
                userStates[sender].state = 'INIT';
            }
            
        } else {
            // Manejo de estados especiales
            switch(state) {
                case 'verificacion':
                    const resp = classifyYesNo(mensaje);
                    if (resp === true) {
                        // Lógica para subir documentos
                    } else if (resp === false) {
                        userStates[sender].state = 'correccion';
                        response = `🔄 ¿Qué dato deseas corregir?\n${TRAMITE_FLOW.map((s, i) => `${i+1}. ${s.label}`).join('\n')}`;
                    }
                    break;
                    
                case 'correccion':
                    const opcion = parseInt(mensaje);
                    if (opcion >= 1 && opcion <= TRAMITE_FLOW.length) {
                        userStates[sender].state = `correccion_${TRAMITE_FLOW[opcion-1].key}`;
                        response = `Ingrese el nuevo valor para: ${TRAMITE_FLOW[opcion-1].label}`;
                    }
                    break;
                    
                case 'select_option_deuda':
                    const option = parseInt(mensaje);
                    switch(option) {
                        case 1:
                            data.adjustmentFlow = 'monto';
                            userStates[sender].state = 'monto';
                            response = `Ingrese nuevo monto (máximo ${data.max_loan_amount.toFixed(2)} Bs):`;
                            break;
                        case 2:
                            data.adjustmentFlow = 'plazo';
                            userStates[sender].state = 'plazo_en_meses';
                            response = `Ingrese nuevo plazo (6-24 meses):`;
                            break;
                        case 3:
                            userStates[sender].state = 'INIT';
                            response = `Visite nuestras oficinas para más opciones.`;
                            break;
                    }
                    break;
                    
                case 'monto_pago_deuda':
                    data.monto_pago_deuda = parseCurrency(mensaje);
                    response = processCapacityEvaluation(data, userStates, sender);
                    break;
            }
        }

        // Actualizar datos y enviar respuesta
        userStates[sender].data = data;
        await logConversation(sender, state, mensaje, response);
        
        if (response) {
            await sock.sendMessage(sender, { text: response });
        }
        
    } catch (error) {
        userStates[sender].intents += 1;
        console.error(`Error en tramiteIngress [${sender}]:`, error);
        await sock.sendMessage(sender, { text: "⚠️ Ocurrió un error al procesar su solicitud. Intente nuevamente." });
    }
};