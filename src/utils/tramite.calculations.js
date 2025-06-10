export const calculateMonthlyFee = (monto, meses) => {
  const tasaInteresMensual = 0.03;
  if (!monto || !meses || meses <= 0) return null;

  const i = tasaInteresMensual;
  const n = meses;
  const cuota = (monto * i) / (1 - Math.pow(1 + i, -n));

  return Math.round(cuota * 100) / 100;
};

export const calculateCapacidad = (data) => {
  return (data.sueldo / 2) - (data.monto_pago_deuda || 0);
};

export const calculateCapacidadFamiliar = (data) => {
  return ((data.sueldo / 2) - (data.monto_pago_deuda || 0)) + (data.ingreso_familiar / 2);
};

export const calculateMaxLoanAmount = (capacidadPago, plazoMeses) => {
  const tasaInteresMensual = 0.03;
  if (!capacidadPago || !plazoMeses || plazoMeses <= 0) return null;

  const i = tasaInteresMensual;
  const n = plazoMeses;
  const monto = capacidadPago * (1 - Math.pow(1 + i, -n)) / i;

  return Math.round(monto * 100) / 100;
};
