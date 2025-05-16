import { MIN_PLAZO, MAX_PLAZO, MIN_MONTO, MAX_MONTO, showVerification } from '../utils/tramite.constant.js';
import { saveDataTramiteUser, validateRange, calculateMonthlyFee, processCapacityEvaluation } from '../utils/tramite.helppers.js';
import { userRetryMessage } from '../controllers/user.messages.controller.js';

export const TRAMITE_FLOW = [
  {
    key: 'documento_custodia',
    label: '¿Cuentas con un documento de custodia? (Inmueble o de vehiculo) *Ten en cuenta que este tiene que estar a tu nombre* (Sí/No)',
    emoji: '📄',
    validation: (input) => ['sí', 'si', 'no', 's', 'n'].includes(input.toLowerCase()),
    errorMessage: '❌ Responda Sí o No'
  },
  // Datos personales
  {
    key: 'nombre_completo',
    label: 'Nombre completo',
    emoji: '👤',
    validation: (input) => /^[a-zA-ZÁÉÍÓÚÑáéíóúñ0-9\s]{5,}$/g.test(input.trim()) && /\D/.test(input.trim()),
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
    label: 'Dirección de domicilio (ej: Av. Principal #123, Urbanización)',
    emoji: '🏠',
    validation: (input) => {
      const trimmed = input.trim();
      return (
        trimmed.length >= 3 && /^[a-zA-ZÁÉÍÓÚÑáéíóúñ0-9\s\/\-.,#]+$/g.test(trimmed) && /\D/.test(trimmed)
      );
    },
    errorMessage: '❌ Formato inválido. Ejemplo: "Calle Libertad #25, Residencias Valle"'
  },
  {
    key: 'enlace_maps',
    label: 'Comparte tu ubicación (o escribe *omitir*)',
    emoji: '🗺️',
    validation: (input) =>
      typeof input === 'string' && input.toLowerCase().trim() === "omitir" ||
      typeof input === 'object' && input.degreesLatitude,
    errorMessage: '❌ Por favor, comparte tu ubicación o escribe *omitir*'
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
    label: 'Monto a solicitar  (ej:5000) ',
    emoji: '💵',
    validation: (input, max_monto) => {
      const amount = parseFloat(input.replace(/[^0-9.]/g, ''));
      return amount >= MIN_MONTO && amount <= max_monto;
    },
    errorMessage: (min, max) => `❌ Monto inválido. Debe ser menor a ${max} Bs`
  },
  {
    key: 'plazo_meses',
    label: `Plazo en meses (entre ${MIN_PLAZO} y ${MAX_PLAZO} meses)`,
    emoji: '📅',
    validation: (input) => {
      const months = parseInt(input);
      return months >= MIN_PLAZO && months <= MAX_PLAZO;
    },
    errorMessage: `❌ Plazo inválido. Debe ser entre ${MIN_PLAZO} y ${MAX_PLAZO} meses`
  },
  // Situación financiera
  {
    key: 'rubro',
    label: ` ¿A qué rubro te dedicas?

  1️⃣ Financiera
  2️⃣ Comercial
  3️⃣ Industria
  4️⃣ Salud
  5️⃣ Educación

  *Escribe el número del rubro*`,
    emoji: '💼',
    validation: (input) => {
      const validRubro = ['1', '2', '3', '4', '5'];
      return validRubro.includes(input);
    },
    errorMessage: '❌ Seleccione un rubro'
  },
  {
    key: 'sueldo',
    label: '¿Cuánto de sueldos percibes al mes?',
    emoji: '💵',
    validation: (input) => parseFloat(input.replace(/[^0-9.]/g, '')) > 0,
    errorMessage: (min, max) => `❌ Monto inválido.`
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
    key: 'cantidad_deuda',
    label: '¿Cuántas deudas fincieras tiene?',
    emoji: '💳',
    validation: (input) => parseFloat(input.replace(/[^0-9.]/g, '')) >= 0,
    errorMessage: '❌ Ingrese un número válido'
  },
  {
    key: 'monto_pago_deuda',
    label: '¿Cuánto es lo que cancela al mes?',
    emoji: '💳',
    skipCondition: (data) => data.deuda?.toLowerCase() === 'no',
    validation: (input) => parseFloat(input.replace(/[^0-9.]/g, '')) >= 0,
    errorMessage: '❌ Ingrese un monto válido'
  },
  {
    key: 'familiar_asalariado',
    label: '¿Tiene algun ingreso familiar que sea asalariado? (Sí/No)',
    emoji: '👨‍👩‍👧‍👦',
    validation: (input) => ['sí', 'si', 'no', 's', 'n'].includes(input.toLowerCase()),
    errorMessage: '❌ Ingrese Sí o No'
  },
  {
    key: 'sueldo_familiar',
    label: '¿Cuanto es lo que percibe al mensual?',
    emoji: '👨‍👩‍👧‍👦',
    validation: (input) => parseFloat(input.replace(/[^0-9.]/g, '')) > 0,
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

// Helper para obtener el mensaje de error para montos
export const getValidationErrorMessageMonto = (key, min, max) => {
  const step = getTramiteStep(key);
  return step?.errorMessage ? step.errorMessage(min, max) : '❌ Entrada inválida';
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

export const handleTextInput = (userStates, sender, data, state, nextState, input, max_value = 0) => {
  if (!validateTramiteInput(state, input, max_value)) {
    return userRetryMessage(userStates, sender, getValidationErrorMessage(state));
  }
  saveDataTramiteUser(userStates, sender, data, state, input, nextState);
  console.log('Estado del flujo:', nextState);
  if (nextState == 'verificacion') {
    return showVerification(data)
  }
  return getTramitePrompt(nextState);
};

export const handleNumberInput = (userStates, sender, data, state, nextState, input, min_value = 0, max_value = 0) => {
  if (!validateRange(input, min_value, max_value)) {
    return userRetryMessage(userStates, sender, getValidationErrorMessageMonto(state, min_value, max_value));
  }
  saveDataTramiteUser(userStates, sender, data, state, input, nextState);
  return getTramitePrompt(nextState);
};

export const handlePlazoInput = (userStates, sender, data, state, nextState, input, min_value = 0, max_value = 0) => {

  if (!validateRange(input, min_value, max_value)) {
    return userRetryMessage(userStates, sender, getValidationErrorMessageMonto(state, min_value, max_value));
  }
  saveDataTramiteUser(userStates, sender, data, state, input, nextState);
  const cuota_mensual = calculateMonthlyFee(data.monto, data.plazo_meses);
  saveDataTramiteUser(userStates, sender, data, 'cuota_mensual', cuota_mensual, nextState);
  if (userStates[sender].adjustmentFlow == 'monto' || userStates[sender].adjustmentFlow == 'plazo') {
    return processCapacityEvaluation(data, userStates, sender);
  } else {
    userStates[sender].state = nextState;
    return getTramitePrompt(nextState);
  }
}

export const handleLocationInput = (userStates, sender, data, state, nextState, input) => {
  console.log('Validando input de ubicación:', state, input, data);
  if (typeof input != "object") {
    if (input.toLowerCase() === "omitir") {
      saveDataTramiteUser(userStates, sender, data, 'latitud', 0, nextState);
      saveDataTramiteUser(userStates, sender, data, 'longitud', 0, nextState);
      return getTramitePrompt(nextState);
    }
  }
  if (input) {
    const { degreesLatitude, degreesLongitude } = input;
    console.log(`Latitud: ${degreesLatitude}, Longitud: ${degreesLongitude}`);
    saveDataTramiteUser(userStates, sender, data, 'latitud', degreesLatitude, nextState);
    saveDataTramiteUser(userStates, sender, data, 'longitud', degreesLongitude, nextState);
    return getTramitePrompt(nextState);
  }
  return userRetryMessage(userStates, sender, getValidationErrorMessage(state));
}