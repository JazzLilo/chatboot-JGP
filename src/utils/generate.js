import { TRAMITE_FLOW } from '../utils/tramite.flow.js';
export const generateApplicationContent = (data, sender) => {
  const contenidoCampos = TRAMITE_FLOW
    .filter((step) => step.genericName) 
    .map((step) => {
      const value = data[step.key];
      if (value !== undefined && value !== null && value !== '') {
        return `${step.genericName}: ${value}`;
      }
      return null;
    })
    .filter(Boolean) 
    .join('\n');

  return `=== DATOS DE LA SOLICITUD ===

Fecha: ${new Date().toLocaleString()}
Número de contacto: ${sender}
${contenidoCampos}
Documento de Custodia: ${data.tipo_documento_custodia}
`;
};