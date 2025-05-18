export const generateApplicationContent = (data, sender) => `
=== DATOS DE LA SOLICITUD ===

Fecha: ${new Date().toLocaleString()}
Nombre: ${data.nombre_completo}
Cédula: ${data.cedula}
Dirección: ${data.direccion}
Email: ${data.email}
Monto solicitado: Bs. ${data.monto}
Plazo: ${data.plazo_meses} meses
Cuota mensual: Bs. ${data.cuota_mensual}
Número de contacto: ${sender}
Sueldo: Bs. ${data.sueldo}
Deudas: Bs. ${data.cantidad_deuda}
Monto de pago de deudas: Bs. ${data.monto_pago_deuda}
Rubro: ${data.rubro}
Latitud: ${data.latitud}
Longitud: ${data.longitud}
Ingreso familiar: Bs. ${data.ingreso_familiar}
Documento de Custodia: ${data.tipo_documento_custodia}
  
`;

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
