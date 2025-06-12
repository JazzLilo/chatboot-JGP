import { contentMenu } from "../utils/message.js";

export const MIN_PLAZO = 6;
export const MAX_PLAZO = 12;
export const MIN_MONTO = 0;
export const MAX_MONTO = 5000;
export const MIN_SUELDO = 0;
export const MAX_SUELDO = 1000000;
export const MIN_DEUDAS = 0;
export const MAX_DEUDAS = 100;

export const CORRECTION_MAP = {
  1: 'correccion-nombre_completo',
  2: 'correccion-cedula',
  3: 'correccion-direccion',
  4: 'correccion-email',
  5: 'correccion-enlace_maps'
};

export const showVerification = (data) => {
  return `Usted cuenta con la capacidad de pago, antes de pasar al siguiente paso:
📋 *Verifique los datos:*
- 1️⃣ *Nombre:* ${data.nombre_completo}
- 2️⃣ *Cédula:* ${data.cedula}
- 3️⃣ *Dirección:* ${data.direccion}
- 4️⃣ *Email:* ${data.email}
- 5️⃣ *Monto:* Bs. ${data.monto}
- 6️⃣ *Plazo:* ${data.plazo_meses} meses
- 🔲 *Cuota:* Bs. ${data.cuota_mensual}
Usted cancelara una cuota mensual de ${data.cuota_mensual} durante ${data.plazo_meses} meses. 
¿Son correctos? (Sí/No)`;
}


export const showValidationCuota = (data) => {
  return `📋 *Verifique los datos:*
- 1️⃣*Monto:* Bs. ${data.monto}
- 2️⃣*Plazo:* ${data.plazo_meses} meses
- 3️⃣*Cuota:* Bs. ${data.cuota_mensual}

En caso de estar de acuerdo, envié (si/no) para continuar ...`; 
}


export const showOptionsDeuda = (data) => {
  
  return `⚠️ *Ajuste necesario*\n
• Capacidad de pago: Bs${data.capacidad}
• Cuota actual: Bs${data.cuota_mensual}
• Máximo préstamo posible: Bs${data.max_loan_amount}

1️⃣ Reducir monto (Bs${data.max_loan_amount})
2️⃣ Extender plazo (hasta ${MAX_PLAZO} meses)
3️⃣ Asesoría presencial

Seleccione una opción:`;
}

export const showChangeData = () => {
  return `🔄 ¿Qué dato deseas corregir?\n1️⃣ Nombre\n2️⃣ Cédula\n3️⃣ Dirección\n4️⃣ Email\n5️⃣Ubicacion Compartida  \n(Escribe el número de la opción o 'cancelar' para terminar.)`;
}
export const showDontGetTramite = () => {
  return `❌ *No puede acceder al trámite*. \n\n${contentMenu}`
}