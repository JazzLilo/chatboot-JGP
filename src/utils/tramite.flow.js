import {MIN_PLAZO, MAX_PLAZO, MIN_MONTO, MAX_MONTO} from '../utils/tramite.constant.js';

export const TRAMITE_FLOW = [
  // Datos personales
  {
    key: 'nombre',
    label: 'Nombre completo',
    emoji: '👤',
    validation: (input) => input.trim().length >= 3,
    errorMessage: '❌ Nombre muy corto. Ingrese su nombre completo'
  },
  {
    key: 'cedula',
    label: 'Número de cédula de identidad',
    emoji: '🆔',
    validation: (input) => /^\d{6,10}$/.test(input),
    errorMessage: '❌ Cédula inválida. Ingrese solo números (6-10 dígitos)'
  },
  {
    key: 'direccion',
    label: 'Dirección de domicilio',
    emoji: '🏠',
    validation: (input) => input.trim().length >= 5,
    errorMessage: '❌ Dirección muy corta. Ingrese una dirección válida'
  },
  {
    key: 'enlace_maps',
    label: 'Comparte tu ubicación (o escribe *omitir*)',
    emoji: '🗺️',
    validation: (input) => input.toLowerCase() === 'omitir' || input.includes('maps.google') || input.includes('goo.gl/maps'),
    errorMessage: '❌ Enlace inválido. Comparte un enlace de Google Maps o escribe *omitir*'
  },
  {
    key: 'email',
    label: 'Correo electrónico',
    emoji: '📧',
    validation: (input) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input),
    errorMessage: '❌ Email inválido. Ingrese un correo válido'
  },
  
  // Datos del préstamo
  {
    key: 'monto',
    label: 'Monto a solicitar (entre 1,000 y 100,000 Bs)',
    emoji: '💵',
    validation: (input, max_monto) => {
      const amount = parseFloat(input.replace(/[^0-9.]/g, ''));
      return amount >= MIN_MONTO && amount <= max_monto;
    },
    errorMessage: '❌ Monto inválido. Debe ser entre 1,000 y 100,000 Bs'
  },
  {
    key: 'plazo_en_meses',
    label: 'Plazo en meses (6-12)',
    emoji: '📅',
    validation: (input) => {
      const months = parseInt(input);
      return months >= MIN_PLAZO && months <= MAX_PLAZO;
    },
    errorMessage: '❌ Plazo inválido. Debe ser entre 6 y 12 meses'
  },
  
  // Situación financiera
  {
    key: 'sueldo',
    label: 'Sueldo mensual neto',
    emoji: '💵',
    validation: (input) => parseFloat(input.replace(/[^0-9.]/g, '')) > 0,
    errorMessage: '❌ Ingrese un monto válido'
  },
  {
    key: 'ingreso_extra',
    label: '¿Recibe ingresos adicionales? (Sí/No)',
    emoji: '💰',
    validation: (input) => ['sí', 'si', 'no', 's', 'n'].includes(input.toLowerCase()),
    errorMessage: '❌ Responda Sí o No'
  },
  {
    key: 'ingreso_extra_monto',
    label: 'Monto de ingresos adicionales mensuales:',
    emoji: '💰',
    skipCondition: (data) => data.ingreso_extra?.toLowerCase() === 'no',
    validation: (input) => parseFloat(input.replace(/[^0-9.]/g, '')) >= 0,
    errorMessage: '❌ Ingrese un monto válido'
  },
  {
    key: 'deuda',
    label: '¿Tiene deudas financieras? (Sí/No)',
    emoji: '💳',
    validation: (input) => ['sí', 'si', 'no', 's', 'n'].includes(input.toLowerCase()),
    errorMessage: '❌ Responda Sí o No'
  },
  {
    key: 'cuota_deuda',
    label: 'Total mensual que paga por deudas:',
    emoji: '💳',
    skipCondition: (data) => data.deuda?.toLowerCase() === 'no',
    validation: (input) => parseFloat(input.replace(/[^0-9.]/g, '')) >= 0,
    errorMessage: '❌ Ingrese un monto válido'
  },
  {
    key: 'verificacion',
    label: 'Verifique sus datos',
    emoji: '✅'
  },
  {
    key: 'correccion',
    label: '¿Qué dato desea corregir?',
    emoji: '✏️'
  }
];

// Helper para obtener un paso del flujo
export const getTramiteStep = (key) => {
  return TRAMITE_FLOW.find(step => step.key === key);
};

// Helper para obtener el mensaje completo de un paso
export const getTramitePrompt = (key) => {
  const step = getTramiteStep(key);
  return step ? `${step.emoji} ${step.label}` : '';
};

// Helper para validar la entrada del usuario
export const validateTramiteInput = (key, input, maxMonto) => {
  console.log('Validando input:', key, input);
  const step = getTramiteStep(key);
  if (key === 'monto') {
    return step?.validation ? step.validation(input, maxMonto) : true;
  }
  return step?.validation ? step.validation(input) : true;
};

// Helper para obtener el mensaje de error
export const getValidationErrorMessage = (key) => {
  const step = getTramiteStep(key);
  return step?.errorMessage || '❌ Entrada inválida';
};

// Helper para obtener el siguiente paso considerando condiciones de salto
export const getNextTramiteKey = (currentKey, data) => {
  const currentIndex = TRAMITE_FLOW.findIndex(step => step.key === currentKey);
  
  if (currentIndex === -1 || currentIndex >= TRAMITE_FLOW.length - 1) {
    return null;
  }

  // Buscar el siguiente paso que no cumpla condiciones de salto
  for (let i = currentIndex + 1; i < TRAMITE_FLOW.length; i++) {
    const nextStep = TRAMITE_FLOW[i];
    
    if (!nextStep.skipCondition || !nextStep.skipCondition(data)) {
      return nextStep.key;
    }
  }

  return null;
};