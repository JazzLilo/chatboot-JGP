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
