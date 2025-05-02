export const contentMenu = `
  📋 *Menú Principal:*
  1️⃣ Información General
  2️⃣ Requisitos
  3️⃣ Sucursales y Horarios
  4️⃣ Iniciar Trámite Virtual
  (Selecciona una opción escribiendo el número correspondiente)
    `;

export const messageNotTrained = '❌ Lo siento, no tengo información sobre eso. Por favor, contacta con soporte técnico para asistencia.';

export const messageCancel = '❌ Has excedido el número máximo de intentos de cancelación. Por favor, contacta con soporte técnico para asistencia.';

export const messageCancelSuccess = '✅ Has cancelado tu solicitud. Puedes iniciar nuevamente el trámite en cualquier momento.';

export const messageCancelFull = '✅ Tu solicitud ha sido cancelada exitosamente. Puedes iniciar nuevamente el trámite en cualquier momento.';

export const messageRequestFile = '❌ Por favor, envíe un archivo (imagen, documento PDF u otro formato).' 

export const messageMaxRetry = '❌ Demasiados intentos inválidos. Por favor, Espere unos minutos para intentarlo de nuevo.'

export const messageRequestFileSuccess = (file_name) =>
  `✅ ${file_name} recibido correctamente.`;

export const messageRequestFileError = (file_name) =>
  `❌ ${file_name} no es válido o no cumple con el formato requerido. Por favor, inténtalo de nuevo.`;

export const messageProcessFileError = '❌ Hubo un error al procesar el archivo. Por favor, inténtalo de nuevo.'