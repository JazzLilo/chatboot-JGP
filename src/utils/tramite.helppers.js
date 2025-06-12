import { MAX_CANCEL_ATTEMPTS } from '../utils/constant.js'
import { showOptionsDeuda, showVerification, showDontGetTramite } from '../utils/tramite.constant.js'
import { getTramitePrompt } from '../utils/tramite.flow.js'
import { calculateCapacidad, calculateCapacidadFamiliar, calculateMaxLoanAmount } from '../utils/tramite.calculations.js';
import { resetUserState } from '../controllers/user.state.controller.js';
import { contentMenu, messageCancel, messageCancelFull, messageCancelSuccess, messageNotTrained} from '../utils/message.js';

export const processCapacityEvaluation = (data, userStates, sender) => {
  const capacidad = calculateCapacidad(data);
  if (capacidad < 0) return fondos_insuficientes(userStates, sender);

  data.capacidad = capacidad;
  data.max_loan_amount = calculateMaxLoanAmount(capacidad, data.plazo_meses);

  if (capacidad > data.cuota_mensual) {
    userStates[sender].state = "verificacion";
    return showVerification(data);
  }

  userStates[sender].state = "familiar_asalariado";
  return getTramitePrompt("familiar_asalariado");
};

export const processCapacityEvaluationFamiliar = (data, userStates, sender) => {
  const capacidad = calculateCapacidadFamiliar(data);
  if (capacidad < 0) return fondos_insuficientes(userStates, sender);

  data.capacidad = capacidad;
  data.max_loan_amount = calculateMaxLoanAmount(capacidad, data.plazo_meses);

  if (capacidad > data.cuota_mensual) {
    userStates[sender].state = "verificacion";
    return showVerification(data);
  }

  userStates[sender].state = "select_option_deuda";
  return showOptionsDeuda(data);
};

export const handleCancel = async (sender, userStates) => {
  if (!userStates[sender]) return `${messageNotTrained} \n\n${contentMenu}`;

  const { cancelAttempts } = userStates[sender];

  const cancel_count_temp = userStates[sender].cancelAttempts += 1;
  if (cancelAttempts > MAX_CANCEL_ATTEMPTS) return messageCancel;
  userStates[sender].timeout
  resetUserState(userStates, sender, messageCancelSuccess);
  userStates[sender].cancelAttempts = cancel_count_temp;
  return `${messageCancelFull} \n\n${contentMenu}`;
}

export const saveDataTramiteUser = (userStates, sender, data, state, value, nextState) => {
  data[state] = value;
  userStates[sender].state = nextState;
  userStates[sender].retries = 0;
};

export const fondos_insuficientes = (userStates, sender) => {
  userStates[sender].state = "fondos_insuficientes";
  return showDontGetTramite();
};