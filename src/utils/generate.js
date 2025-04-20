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