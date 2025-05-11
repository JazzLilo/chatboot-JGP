export const MIN_PLAZO = 6;
export const MAX_PLAZO = 12;
export const MIN_MONTO = 1000;
export const MAX_MONTO = 1000000;

export const showVerification = (data) => {
  return `📋 *Verifique los datos:*
- 1️⃣ *Nombre:* ${data.nombre_completo}
- 2️⃣ *Cédula:* ${data.cedula}
- 3️⃣ *Dirección:* ${data.direccion}
- 4️⃣ *Email:* ${data.email}
- 5️⃣ *Monto:* Bs. ${data.monto}
- 6️⃣ *Plazo:* ${data.plazo_meses} meses
- 🔲 *Cuota:* Bs. ${data.cuota_mensual}

¿Son correctos? (Sí/No)`;
}


export const showValidationCuota = (data) => {
  return `📋 *Verifique los datos:*
- 1️⃣*Monto:* Bs. ${data.monto}
- 2️⃣*Plazo:* ${data.plazo_meses} meses
- 3️⃣*Cuota:* Bs. ${data.cuota_mensual}

En caso de estar de acuerdo, envié (si/no) para continuar ...`; 
}


export const showOptionsDeuda = (data, capacidad, maxLoan) => {
  //const capacidad = calculateCapacidad(data);
  //#const maxLoan = calculateMaxLoanAmount(capacidad, data.plazo_meses);
  
  return `⚠️ *Ajuste necesario*\n
• Capacidad de pago: Bs${capacidad}
• Cuota actual: Bs${data.cuota_mensual}
• Máximo préstamo posible: Bs${maxLoan}

1️⃣ Reducir monto (Bs${maxLoan})
2️⃣ Extender plazo (hasta 24 meses)
3️⃣ Asesoría presencial

Seleccione una opción:`;
}