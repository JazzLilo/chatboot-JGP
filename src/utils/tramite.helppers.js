import { showOptionsDeuda, showVerification } from '../utils/tramite.constant.js'
import { tabla_asesor } from '../utils/constant.js';
export const parseCurrency = (input) => parseFloat(input.replace(/[^0-9.]/g, ""));
export const validateRange = (value, min, max) => !isNaN(value) && value >= min && value <= max;

export const processCapacityEvaluation = (data, userStates, sender) => {
  const capacidad = calculateCapacidad(data);
  data.max_loan_amount = calculateMaxLoanAmount(capacidad, data.plazo_meses);

  if (capacidad > data.cuota_mensual) {
    userStates[sender].state = "verificacion";
    return showVerification(data);
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
    const valor = tabla_asesor[meses];
    if (!valor) return null;
    const resultado = (monto / 1000) * valor;
    return Math.round(resultado * 100) / 100;
}

export const calculateCapacidad = (data) => {
    return (data.sueldo/2) + (data.ingreso_extra || 0) + (data.monto_pago_deuda || 0)
}

export const calculateMaxLoanAmount = (capacidadPago, plazoMeses) => {
    const valor = tabla_asesor[plazoMeses];
    if (!valor) return null;
    const resultado = (capacidadPago * 1000) / valor;
    return Math.round(resultado * 100) / 100;
}