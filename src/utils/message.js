export const contentMenu = `
  📋 *Menú Principal:*
  1️⃣ Información General
  2️⃣ Requisitos
  3️⃣ Sucursales y Horarios
  4️⃣ Iniciar Trámite Virtual
  (Selecciona una opción escribiendo el número correspondiente)
    `;

export const messageExceededRetries = '❌ Demasiados intentos inválidos. Por favor, inicie el trámite nuevamente.';

export const messageNotTrained = '❌ Lo siento, no tengo información sobre eso. Por favor, contacta con soporte técnico para asistencia.';

export const messageCancel = '❌ Has excedido el número máximo de intentos de cancelación. Por favor, Intenta nuevamente en unos minutos.';

export const messageCancelSuccess = '✅ Has cancelado tu solicitud. Puedes iniciar nuevamente el trámite en cualquier momento.';

export const messageCancelFull = '✅ Tu solicitud ha sido cancelada exitosamente. Puedes iniciar nuevamente el trámite en cualquier momento.';

export const messageRequestFile = '❌ Por favor, envíe un archivo (imagen, documento PDF u otro formato).' 

export const messageMaxRetry = '❌ Demasiados intentos inválidos. Por favor, Espere unos minutos para intentarlo de nuevo.'

export const messagePrestamosAsalariado = '❌ Lo sentimos, por ahora solo prestamos para asalariados. Aquí tienes más información:'

export const messageMontoValido = '❌ Ingrese un monto válido (ej: 1500)'

export const messageCustodia = '❌ Lo sentimos, Usted debe contar con un documento en custodia para iniciar el trámite. Puede pasarse por nuestras Sucursales.'

export const messageSaldoInsuficiente = '❌ Lo sentimos, no puedes acceder al trámite. Puedes visitar nuestras sucursales para más información.'

export const meesageRespondaSioNo = '❌ Por favor, responda con "Sí" o "No".';

export const messageRequestFileSuccess = (file_name) =>
  `✅ ${file_name} recibido correctamente.`;

export const messageRequestFileError = (file_name) =>
  `❌ ${file_name} no es válido o no cumple con el formato requerido. Por favor, inténtalo de nuevo.`;

export const messageRequestFileCiError = `❌ El numero de CI no es igual al numero de CI en el carnet. Por favor, envíe la Cédula de identidad (anverso).`;

export const messageProcessFileError = '❌ Hubo un error al procesar el archivo. Por favor, inténtalo de nuevo.'

export const messageRequestFileCustodiaError = `❌ El nombre del propietario no coincide con el nombre en el documento de custodia. Por favor, inténtalo de nuevo.`