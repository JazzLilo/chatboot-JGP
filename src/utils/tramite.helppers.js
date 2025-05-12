import { showOptionsDeuda, showVerification } from '../utils/tramite.constant.js'
import { tabla_asesor } from '../utils/constant.js';
export const parseCurrency = (input) => parseFloat(input.replace(/[^0-9.]/g, ""));
export const validateRange = (value, min, max) => !isNaN(value) && value >= min && value <= max;

/**
 * Evaluates the user's financial capacity and updates user state accordingly.
 * 
 * @param {object} data - Contains user financial data including 'cuota_mensual' and 'plazo_meses'.
 * @param {object} userStates - Object maintaining the state for each user session.
 * @param {string} sender - Identifier for the user session.
 * @returns {string} - Returns a verification message if capacity is sufficient, otherwise returns options for debt adjustment.
 */

export const processCapacityEvaluation = (data, userStates, sender) => {
  const capacidad = calculateCapacidad(data);
  data.max_loan_amount = calculateMaxLoanAmount(capacidad, data.plazo_meses);
  if (capacidad > data.cuota_mensual) {
    userStates[sender].state = "verificacion";
    return showVerification(data,);
  }

  userStates[sender].state = "select_option_deuda";
  return showOptionsDeuda(data, capacidad, data.max_loan_amount);
}

/**
 * Calcula la cuota mensual basada en el monto y el plazo.
 * 
 * @param {number} monto - El monto solicitado.
 * @param {number} meses - El plazo en meses.
 * @returns {number|null} - La cuota mensual calculada o null si el plazo no es válido.
 */
export const calculateMonthlyFee = (monto, meses) => {
    const valor = tabla_asesor[meses];
    if (!valor) return null;
    const resultado = (monto / 1000) * valor;
    return Math.round(resultado * 100) / 100;
}

export const calculateCapacidad = (data) => {
    return (data.sueldo/2) + (data.ingreso_extra_monto || 0) + (data.monto_pago_deuda|| 0)
}

export const calculateMaxLoanAmount = (capacidadPago, plazoMeses) => {
    const valor = tabla_asesor[plazoMeses];
    if (!valor) return null;
    const resultado = (capacidadPago * 1000) / valor;
    return Math.round(resultado * 100) / 100;
}

export const saveDataTramiteUser = (userStates, sender, data, state, value, nextState) => {
      data[state] = value;
      userStates[sender].state = nextState;
      userStates[sender].retries = 0;
}