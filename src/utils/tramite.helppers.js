import { showOptionsDeuda, showVerification } from '../utils/tramite.constant.js'

import {  getTramitePrompt } from '../utils/tramite.flow.js'
export const parseCurrency = (input) => {
  const cleaned = input.replace(/[^\d.-]/g, '');
  
  const match = cleaned.match(/-?(\d+\.?\d*|\d*\.?\d+)/);
  
  return match ? parseFloat(match[0]) : NaN;
};
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
  data.capacidad = capacidad;
  data.max_loan_amount = calculateMaxLoanAmount(capacidad, data.plazo_meses);
  if (capacidad > data.cuota_mensual) {
    userStates[sender].state = "verificacion";
    return showVerification(data,);
  }
  userStates[sender].state = "familiar_asalariado";
  return getTramitePrompt("familiar_asalariado");
}

export const processCapacityEvaluationFamiliar = (data, userStates, sender) => {
  const capacidad = calculateCapacidadFamiliar(data);
  data.capacidad = capacidad;
  data.max_loan_amount = calculateMaxLoanAmount(capacidad, data.plazo_meses);
  if (capacidad > data.cuota_mensual) {
    userStates[sender].state = "verificacion";
    return showVerification(data,);
  }
  userStates[sender].state = "select_option_deuda";
  return showOptionsDeuda(data);
}


/**
 * Calcula la cuota mensual basada en el monto y el plazo.
 * 
 * @param {number} monto - El monto solicitado.
 * @param {number} meses - El plazo en meses.
 * @returns {number|null} - La cuota mensual calculada o null si el plazo no es válido.
 */
export const calculateMonthlyFee = (monto, meses) => {
  const tasaInteresMensual = 0.03;

  if (!monto || !meses || meses <= 0) return null;

  const i = tasaInteresMensual;
  const n = meses;

  const cuota = (monto * i) / (1 - Math.pow(1 + i, -n));

  return Math.round(cuota * 100) / 100;
};


export const calculateCapacidad = (data) => {
  return (data.sueldo / 2) + (data.monto_pago_deuda || 0)
}

export const calculateCapacidadFamiliar = (data) => {
  return (data.sueldo / 2)  + (data.monto_pago_deuda || 0) + (data.ingreso_familiar / 2)
}

export const calculateMaxLoanAmount = (capacidadPago, plazoMeses) => {
  const tasaInteresMensual = 0.03;

  if (!capacidadPago || !plazoMeses || plazoMeses <= 0) return null;

  const i = tasaInteresMensual;
  const n = plazoMeses;

  const monto = capacidadPago * (1 - Math.pow(1 + i, -n)) / i;

  return Math.round(monto * 100) / 100;
};

export const saveDataTramiteUser = (userStates, sender, data, state, value, nextState) => {
  data[state] = value;
  userStates[sender].state = nextState;
  userStates[sender].retries = 0;
}