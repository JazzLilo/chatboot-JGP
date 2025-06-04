
export const dateToday = new Date().toISOString().split('T')[0];

export const dateFormatToday = () => {
  const today = new Date();
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];

  const day = today.getDate();
  const month = months[today.getMonth()];
  const year = today.getFullYear();

  return `${day} de ${month} de ${year}`;
};


/**
 * Flujo de documentos a solicitar, con su clave, etiqueta y emoji.
 */
export const documentsFlow = [
  {
    key: 'foto_ci_an',
    label: 'Cédula de identidad (anverso)',
    emoji: '📷',
    mimeType: 'image/jpeg',
    prompt: `Analiza esta imagen y responde únicamente si el anverso de la cédula de identidad boliviana es LEGIBLE y VIGENTE.
La fecha de hoy es ${dateFormatToday()}.

Para saber si está vigente, compara la fecha de vencimiento de la cédula con la fecha actual: 
- Si la fecha de vencimiento es posterior a la fecha actual, entonces la cédula es válida.
- Si ya venció o no es legible, entonces no es válida.

Responde únicamente con:
"si" o "no",sin tildes ni comillas.`
  },
  {
    key: 'foto_ci_re',
    label: 'Cédula de identidad (reverso)',
    emoji: '📷',
    mimeType: 'image/jpeg',
    prompt: `Analiza esta imagen y responde únicamente si el reverso de la cédula de identidad boliviana es LEGIBLE, que si solo si sea el reverso de la cédula de identidad.

Responde únicamente con:
"si" o "no",sin tildes ni comillas.`
  },
  {
    key: 'croquis',
    label: 'Croquis de domicilio',
    emoji: '📐',
    mimeType: 'image/jpeg',
    prompt: `Analiza si este archivo es un croquis claro de ubicación de domicilio con referencias visibles.
La fecha de hoy es ${dateToday}.

Responde únicamente con:
"si" o "no",sin tildes ni comillas.`
  },
  {
    key: 'boleta_pago1',
    label: 'Boleta de pago 1',
    emoji: '💰',
    mimeType: 'image/jpeg',
    prompt: `Analiza si esta imagen corresponde a una boleta de pago boliviana.
Responde únicamente con:
"si" o "no", sin tildes ni comillas.`
  },
  {
    key: 'boleta_pago2',
    label: 'Boleta de pago 2',
    emoji: '💰',
    mimeType: 'image/jpeg',
    prompt: `Analiza si esta imagen corresponde a una boleta de pago boliviana.
Responde únicamente con:
"si" o "no", sin tildes ni comillas.`
  },
  {
    key: 'boleta_pago3',
    label: 'Boleta de pago 3',
    emoji: '💰',
    mimeType: 'image/jpeg',
    prompt: `Analiza si esta imagen corresponde a una boleta de pago boliviana.
Responde únicamente con:
"si" o "no", sin tildes ni comillas.`
  },
  {
    key: 'factura',
    label: 'Factura de servicios *Luz, Agua o Gas*',
    emoji: '📄',
    mimeType: 'image/jpeg',
    prompt: `Analiza si esta imagen corresponde a una factura de luz, agua o gas, con datos legibles y reciente.
La fecha de hoy es ${dateToday}.

Responde únicamente con:
"si" o "no",sin tildes ni comillas.`
  },
  {
    key: 'gestora_publica_afp',
    label: '*Gestora Pública AFP* en formato PDF',
    emoji: '📑',
    mimeType: 'application/pdf',
    prompt: `Verifica si este archivo PDF corresponde a un documento a alguna gestora de AFP.

Responde únicamente con:
"si" o "no",sin tildes ni comillas.`
  },
  {
    key: 'custodia',
    label: 'Documento de custodia',
    emoji: '📜',
    mimeType: 'image/jpeg',
    prompt: `Analiza si este archivo si es un RUAT o un FOLIO REAL, ambos son documentos Bolivianos.
Responde únicamente con:
"si" o "no" , sin tildes ni comillas. y si es no dime el porque no.`
  },
  {
    key: 'boleta_impuesto',
    label: 'Boleta de impuesto',
    emoji: '🧾',
    mimeType: 'image/jpeg',
    prompt: `Analiza si esta imagen corresponde a una boleta de impuesto, con datos legibles y reciente.
Responde únicamente con:
"si" o "no",sin tildes ni comillas.`
  },
];

/**
 * Construye el estado asociado a una clave de documento.
 */
export const getDocumentState = (key) => `solicitar_documento_${key}`;

/**
 * Genera el prompt para pedir un documento por su clave.
 */
export const getDocumentMessage = (key) => {
  const doc = documentsFlow.find(d => d.key === key);
  return `${doc.emoji} Por favor, envíe la *${doc.label}*.`;
};

/**
 * Obtiene la siguiente clave de documento en el flujo.
 */
export const getNextDocumentKey = (currentKey) => {
  const idx = documentsFlow.findIndex(d => d.key === currentKey);
  return idx >= 0 && idx < documentsFlow.length - 1
    ? documentsFlow[idx + 1].key
    : null;
};

/**
 * Obtiene el siguiente estado a partir del estado actual.
 */
export const getNextDocumentState = (currentState) => {
  const currentKey = currentState.replace('solicitar_documento_', '');
  const nextKey = getNextDocumentKey(currentKey);
  return nextKey ? getDocumentState(nextKey) : null;
};

export const getDocumentMimeType = (key) => {
  const doc = documentsFlow.find(d => d.key === key);
  return doc ? doc.mimeType : null;
}

export const getDocumentPrompt = (key) => {
  const doc = documentsFlow.find(d => d.key === key);
  return doc ? doc.prompt : null;
}

export const dataFieldAssignment = (data, documentKey, filePath) => {
  data[documentKey] = filePath;
};