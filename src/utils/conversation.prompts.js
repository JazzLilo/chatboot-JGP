export const getNextDocument = (currentDocument) => {
  const order = [
    "foto_ci_an",
    "foto_ci_re",
    "croquis",
    "boleta_pago1",
    "boleta_pago2",
    "boleta_pago3",
    "factura",
    "gestora_publica_afp",
  ];

  const currentIndex = order.indexOf(currentDocument);
  if (currentIndex === -1) return null;
  const nextIndex = currentIndex + 1;
  if (nextIndex >= order.length) return null;
  return order[nextIndex];
}

export const getNextState = (currentState) => {
  const order = [
    "solicitar_documento_foto_ci_an",
    "solicitar_documento_foto_ci_re",
    "solicitar_documento_croquis",
    "solicitar_documento_boleta_pago1",
    "solicitar_documento_boleta_pago2",
    "solicitar_documento_boleta_pago3",
    "solicitar_documento_factura",
    "solicitar_documento_gestora_publica_afp"]
}

export const dataFieldAssignment = (data, documentKey, filePath) => {
  switch (documentKey) {
    case "foto_ci_an":
      data.foto_ci_an = filePath;
      break;
    case "foto_ci_re":
      data.foto_ci_re = filePath;
      break;
    case "croquis":
      data.croquis = filePath;
      break;
    case "boleta_pago1":
      data.boleta_pago1 = filePath;
      break;
    case "boleta_pago2":
      data.boleta_pago2 = filePath;
      break;
    case "boleta_pago3":
      data.boleta_pago3 = filePath;
      break;
    case "factura":
      data.factura = filePath;
      break;
    case "gestora_publica_afp":
      data.gestora_publica_afp = filePath;
      break;
    default:
      console.warn(`Documento desconocido: ${documentKey}`);
  }
}



export const getDocumentPrompt = (documentKey) => {
  switch (documentKey) {
    case "foto_ci_an":
      return `📷 Por favor, envíe la *Foto de CI Anverso*.`;
    case "foto_ci_re":
      return `📷 Por favor, envíe la *Foto de CI Reverso*.`;
    case "croquis":
      return `📐 Por favor, envíe el *Croquis*.`;
    case "boleta_pago1":
      return `💰 Por favor, envíe la *Boleta de Pago 1*.`;
    case "boleta_pago2":
      return `💰 Por favor, envíe la *Boleta de Pago 2*.`;
    case "boleta_pago3":
      return `💰 Por favor, envíe la *Boleta de Pago 3*.`;
    case "factura":
      return `📄 Por favor, envíe la *Factura de Luz, Agua o Gas*.`;
    case "gestora_publica_afp":
      return `📑 Por favor, envíe la *Gestora Pública AFP* en formato PDF.`;
    default:
      return `📄 Por favor, envíe el documento solicitado.`;
  }
}

export const documentNames = {
  foto_ci_an: 'Cédula de identidad (anverso)',
  foto_ci_re: 'Cédula de identidad (reverso)',
  croquis: 'Croquis de domicilio',
  boleta_pago1: 'Boleta de pago 1',
  boleta_pago2: 'Boleta de pago 2',
  boleta_pago3: 'Boleta de pago 3',
  factura: 'Factura de servicios',
  gestora_publica_afp: 'Documento AFP'
};

export const getDocumentDescription = (key) => {
  return documentNames[key] || 'Documento';
}