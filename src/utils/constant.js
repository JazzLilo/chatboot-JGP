"use strict";

export const promptFiles = [
  // { key: "saludo", file: "Saludo_y_Conduccion.json" },
  // { key: "despedida", file: "Despedida.json" },
  // { key: "informacion_general", file: "Informacion_General_Empresa.json" },
  // { key: "sucursales_horarios", file: "Sucursales_y_Horarios.json" },
  // { key: "servicios_ofrecidos", file: "Servicios_Ofrecidos.json" },
  // { key: "requisitos", file: "requisitos.json" },
  // { key: "menu", file: "menu.json" },
  // { key: "tramite_virtual", file: "Tramite_Virtual.json" },
  // {
  //   key: "informacion_prestamos_asalariados",
  //   file: "Informacion_Prestamos_Asalariados.json",
  // },
  // { key: "requisitos_tramite", file: "Requisitos_tramite.json" },
  // { key: "chatbot", file: "Chatbot.json" },
  // { key: "otra_informacion", file: "Otras_preguntas.json" },
];

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



export const tabla_asesor = {
  1: 1090,
  2: 552.61,
  3: 376.86,
  4: 289.03,
  5: 236.35,
  6: 203.26,
  7: 176.22,
  8: 157.46,
  9: 141.88,
  10: 133.23,
  11: 123.11,
  12: 113.80,
  13: 109.11,
  14: 100.67,
  15: 95.10,
  16: 90.74,
  17: 85.95
};

export const MAX_CANCEL_ATTEMPTS = 3;
export const MAX_RETRIES = 3;

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