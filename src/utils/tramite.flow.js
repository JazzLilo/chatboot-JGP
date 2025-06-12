import { MIN_PLAZO, MAX_PLAZO, MIN_MONTO, MAX_MONTO, showVerification } from '../utils/tramite.constant.js';
import { saveDataTramiteUser, processCapacityEvaluation } from '../utils/tramite.helppers.js';
import { calculateMonthlyFee } from '../utils/tramite.calculations.js';
import { userRetryMessage } from '../utils/user.intents.messages.js';
import { validateRange } from '../utils/tramite.validations.js';

export const TRAMITE_FLOW = [
  {
    key: 'documento_custodia',
    genericName: 'Documento de custodia',
    label: '¿Cuentas con un documento de custodia? (Inmueble o de vehiculo) *Ten en cuenta que este tiene que estar a tu nombre* (Sí/No)',
    emoji: '📄',
    validation: (input) => ['sí', 'si', 'no', 's', 'n'].includes(input.toLowerCase()),
    errorMessage: '❌ Responda Sí o No'
  },
  // Datos personales
  {
    key: 'nombre_completo',
    genericName: 'Nombre completo',
    label: 'Nombre completo',
    emoji: '👤',
    validation: (input) => /^[a-zA-ZÁÉÍÓÚÑáéíóúñ0-9\s]{5,}$/g.test(input.trim()) && /\D/.test(input.trim()),
    errorMessage: '❌ Nombre muy corto. Ingrese su nombre completo'
  },
  {
    key: 'cedula',
    genericName: 'Cédula de identidad',
    label: 'Número de cédula de identidad',
    emoji: '🆔',
    validation: (input) => /^\d{6,10}$/.test(input),
    errorMessage: '❌ Cédula inválida. Ingrese solo números (6-10 dígitos)'
  },
  {
    key: 'direccion',
    genericName: 'Dirección de domicilio',
    label: 'Dirección de domicilio (ej: Av. Principal #123, Urbanización)',
    emoji: '🏠',
    validation: (input) => {
      const trimmed = input.trim();
      return (
        trimmed.length >= 3 && 
        /^[a-zA-ZÁÉÍÓÚÑáéíóúñ0-9\s\/\-.,#:]+$/g.test(trimmed) && 
        /\D/.test(trimmed)
      );
    },
    errorMessage: '❌ Formato inválido. Ejemplo: "Calle Libertad #25, Residencias Valle"'
  },
  {
    key: 'enlace_maps',
    genericName: 'Enlace de ubicación en Google Maps',
    label: 'Comparte tu ubicación (o escribe *omitir*)',
    emoji: '🗺️',
    validation: (input) =>
      (typeof input === 'string' && input.toLowerCase().trim() === "omitir") ||
      (typeof input === 'object' && input.degreesLatitude),
    errorMessage: '❌ Por favor, comparte tu ubicación o escribe *omitir*'
  },
  {
    key: 'email',
    genericName: 'Correo electrónico',
    label: 'Correo electrónico',
    emoji: '📧',
    validation: (input) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input),
    errorMessage: '❌ Email inválido. Ingrese un correo válido'
  },

  // Datos del préstamo
  {
    key: 'monto',
    genericName: 'Monto del préstamo',
    label: `Monto a solicitar (entre ${MIN_MONTO} y ${MAX_MONTO} Bs)`,
    emoji: '💵',
    validation: (input, maxMonto) => {
      return input >= MIN_MONTO && input <= maxMonto;
    },
    errorMessage: (min, max) => `❌ Monto inválido. Debe ser entre ${min} y ${max} Bs`
  },
  {
    key: 'plazo_meses',
    genericName: 'Plazo del préstamo',
    label: `Plazo en meses (entre ${MIN_PLAZO} y ${MAX_PLAZO} meses)`,
    emoji: '📅',
    validation: (input) => {
      const months = parseInt(input);
      return !isNaN(months) && months >= MIN_PLAZO && months <= MAX_PLAZO;
    },
    errorMessage: (min = MIN_PLAZO, max = MAX_PLAZO) => `❌ Plazo inválido. Debe ser entre ${min} y ${max} meses`
  },
  // Situación financiera
  {
    key: 'rubro',
    genericName: 'Rubro de actividad económica',
    label: `¿A qué rubro te dedicas?

💰 Financiera  
🛒 Comercial  
🏭 Industria  
🏥 Salud  
🎓 Educación  
🌐 Otros

*Escribe el nombre del rubro*`,
    emoji: '💼',
    validation: (input) =>   /^[a-zA-ZÁÉÍÓÚÑáéíóúñ0-9\s]{5,}$/g.test(input.trim()) && /\D/.test(input.trim()),
    errorMessage: '❌ Seleccione un rubro válido'
  },
  {
    key: 'sueldo',
    genericName: 'Sueldo',
    label: '¿Cuánto de sueldos percibes al mes?',
    emoji: '💵',
    validation: (input) => {
      return input> 0;
    },
    errorMessage: () => '❌ Ingrese un monto válido mayor a cero'
  },
  {
    key: 'ingreso_extra',
    genericName: 'Ingreso adicional',
    label: '¿Recibe ingresos adicionales? (Sí/No)',
    emoji: '💰',
    validation: (input) => ['sí', 'si', 'no', 's', 'n'].includes(input.toLowerCase()),
    errorMessage: '❌ Responda Sí o No'
  },
  {
    key: 'ingreso_extra_monto',
    genericName: 'Monto de ingresos adicionales',
    label: 'Monto de ingresos adicionales mensuales:',
    emoji: '💰',
    skipCondition: (data) => data.ingreso_extra?.toLowerCase() === 'no',
    validation: (input) => {
      return input >= 0;
    },
    errorMessage: () => '❌ Ingrese un monto válido (ej: 500)'
  },
  {
    key: 'deuda',
    genericName: 'Deudas financieras',
    label: '¿Tiene deudas financieras? (Sí/No)',
    emoji: '💳',
    validation: (input) => ['sí', 'si', 'no', 's', 'n'].includes(input.toLowerCase()),
    errorMessage: '❌ Responda Sí o No'
  },
  {
    key: 'cantidad_deuda',
    genericName: 'Cantidad de deudas financieras',
    label: '¿Cuántas deudas financieras tiene?',
    emoji: '💳',
    validation: (input) => {
      const count = parseInt(input);
      return !isNaN(count) && count >= 0;
    },
    errorMessage: () => '❌ Ingrese un número válido (ej: 2)'
  },
  {
    key: 'monto_pago_deuda',
    genericName: 'Monto de pago de deudas',
    label: '¿Cuánto es lo que cancela al mes?',
    emoji: '💳',
    skipCondition: (data) => data.deuda?.toLowerCase() === 'no',
    validation: (input) => {
      return input >= 0;
    },
    errorMessage: () => '❌ Ingrese un monto válido (ej: 1500)'
  },
  {
    key: 'familiar_asalariado',
    genericName: 'Ingreso familiar asalariado',
    label: '¿Tiene algun ingreso familiar que sea asalariado? (Sí/No)',
    emoji: '👨‍👩‍👧‍👦',
    validation: (input) => ['sí', 'si', 'no', 's', 'n'].includes(input.toLowerCase()),
    errorMessage: '❌ Ingrese Sí o No'
  },
  {
    key: 'sueldo_familiar',
    genericName: 'Sueldo familiar',
    label: '¿Cuanto es lo que percibe al mensual?',
    emoji: '👨‍👩‍👧‍👦',
    validation: (input) => {
      return input > 0;
    },
    errorMessage: () => '❌ Ingrese un monto válido mayor a cero'
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

// Helpers
export const getTramiteStep = key => TRAMITE_FLOW.find(step => step.key === key);

export const getTramitePrompt = key => {
  const step = getTramiteStep(key);
  return step ? `${step.emoji} ${step.label}` : '';
};

export const validateTramiteInput = (key, input, maxMonto) => {
  const step = getTramiteStep(key);
  if (key === 'monto') {
    return step.validation(input, maxMonto) ;
  }
  return step?.validation ? step.validation(input) : true;
};

export const getValidationErrorMessage = (key) => {
  const step = getTramiteStep(key);
  return step?.errorMessage || '❌ Entrada inválida';
};

export const getValidationErrorMessageMonto = (key, min, max) => {
  const step = getTramiteStep(key);
  return step?.errorMessage ? step.errorMessage(min, max) : '❌ Entrada inválida';
};

export const getNextTramiteKey = (currentKey, data) => {
  const currentIndex = TRAMITE_FLOW.findIndex(step => step.key === currentKey);
  if (currentIndex === -1 || currentIndex >= TRAMITE_FLOW.length - 1) return null;

  for (let i = currentIndex + 1; i < TRAMITE_FLOW.length; i++) {
    const nextStep = TRAMITE_FLOW[i];
    if (!nextStep.skipCondition || !nextStep.skipCondition(data)) {
      return nextStep.key;
    }
  }
  return null;
};

// Handlers
export const handleTextInput = (userStates, sender, data, state, nextState, input, maxValue = 0) => {
  if (!validateTramiteInput(state, input, maxValue)) {
    return userRetryMessage(
      userStates, 
      sender, 
      getValidationErrorMessage(state, MIN_MONTO, maxValue)
    );
  }

  saveDataTramiteUser(userStates, sender, data, state, input, nextState);
  
  return nextState === 'verificacion' 
    ? showVerification(data) 
    : getTramitePrompt(nextState);
};

export const handleNumberInput = (userStates, sender, data, state, nextState, input, minValue = 0, maxValue = 0) => {
  if (!validateTramiteInput(state, input, maxValue)) {
    return userRetryMessage(
      userStates, 
      sender, 
      getValidationErrorMessageMonto(state, minValue, maxValue)
    );
  }
  
  saveDataTramiteUser(userStates, sender, data, state, input, nextState);
  return getTramitePrompt(nextState);
};

export const handlePlazoInput = (userStates, sender, data, state, nextState, input, minValue = 0, maxValue = 0) => {
  if (!validateRange(input, minValue, maxValue)) {
    return userRetryMessage(
      userStates, 
      sender, 
      getValidationErrorMessageMonto(state, minValue, maxValue)
    );
  }

  saveDataTramiteUser(userStates, sender, data, state, input, nextState);
  
  const cuotaMensual = calculateMonthlyFee(data.monto, data.plazo_meses);
  saveDataTramiteUser(userStates, sender, data, 'cuota_mensual', cuotaMensual, nextState);
  
  const { adjustmentFlow } = userStates[sender];
  if (adjustmentFlow === 'monto' || adjustmentFlow === 'plazo') {
    return processCapacityEvaluation(data, userStates, sender);
  }
  
  userStates[sender].state = nextState;
  return getTramitePrompt(nextState);
};

export const handleLocationInput = (userStates, sender, data, state, nextState, input) => {
  console.log('Validando input de ubicación:', input);
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