"use strict";
export const MAX_CANCEL_ATTEMPTS = 3;
export const MAX_RETRIES = 3;

export const validIntents = [
  "saludo",
  "despedida",
  "informacion_general",
  "sucursales_horarios",
  "servicios_ofrecidos",
  "tramite_virtual",
  "requisitos",
  "informacion_prestamos_asalariados",
  "requisitos_tramite",
  "otra_informacion",
  "cancelar",
];


export const DOCUMENT_TYPES = [
  { key: 'foto_ci_an', type: 'Foto CI Anverso' },
  { key: 'foto_ci_re', type: 'Foto CI Reverso' },
  { key: 'croquis', type: 'Croquis' },
  { key: 'boleta_pago1', type: 'Boleta Pago 1' },
  { key: 'boleta_pago2', type: 'Boleta Pago 2' },
  { key: 'boleta_pago3', type: 'Boleta Pago 3' },
  { key: 'factura', type: 'Factura' },
  { key: 'gestora_publica_afp', type: 'Gestora Pública AFP' },
  { key: 'custodia', type: 'Custodia' },
  { key: 'boleta_impuesto', type: 'Boleta Impuesto' },
];