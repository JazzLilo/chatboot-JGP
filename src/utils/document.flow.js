/**
 * Flujo de documentos a solicitar, con su clave, etiqueta y emoji.
 */
export const documentsFlow = [
    { key: 'foto_ci_an',         label: 'Cédula de identidad (anverso)', emoji: '📷' },
    { key: 'foto_ci_re',         label: 'Cédula de identidad (reverso)', emoji: '📷' },
    { key: 'croquis',            label: 'Croquis de domicilio',            emoji: '📐' },
    { key: 'boleta_pago1',       label: 'Boleta de pago 1',                emoji: '💰' },
    { key: 'boleta_pago2',       label: 'Boleta de pago 2',                emoji: '💰' },
    { key: 'boleta_pago3',       label: 'Boleta de pago 3',                emoji: '💰' },
    { key: 'factura',            label: 'Factura de servicios *Luz, Agua o Gas*',            emoji: '📄' },
    { key: 'gestora_publica_afp',label: '*Gestora Pública AFP* en formato PDF',                  emoji: '📑' },
    { key: 'custodia', label: 'Documento de custodia',            emoji: '📜' },
    { key: 'boleta_impuesto',    label: 'Boleta de impuesto',              emoji: '🧾' },
  ];
  
  /**
   * Construye el estado asociado a una clave de documento.
   */
  export const getDocumentState = (key) => `solicitar_documento_${key}`;
  
  /**
   * Genera el prompt para pedir un documento por su clave.
   */
  export const getDocumentPrompt = (key) => {
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
  