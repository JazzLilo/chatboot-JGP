export const nombre = (userMessage, nombre_completo, userStates) => {
    if (!userMessage.trim()) return `❌ Nombre no válido. Intente de nuevo:`;
    nombre_completo = userMessage.trim();
    userStates[sender].state = "cedula";
    return `Perfecto, ${data.nombre_completo}.\nAhora, ingrese su numero de ci (ej: 123456):`;
}

export const cedula = (userMessage, cedula,userStates) => {
    if (!/^\d+$/.test(userMessage) || userMessage.length < 5) {
        return `❌ Cédula no válida. Intente de nuevo:`;
    }
    cedula = userMessage;
    userStates[sender].state = "direccion";
    return `Ahora, ingrese su dirección:`;
}

export const direccion = (userMessage, direccion, userStates) => {
    if (!userMessage.trim())
        return `❌ Dirección no válida. Intente de nuevo:`;
     direccion = userMessage.trim();
     userStates[sender].state = "email";
      return `Entendido, ahora ingrese su email:`;
}

export const email = (userMessage, email, userStates) => {
    if (!validateEmail(userMessage)) {
        return `❌ Email no válido. Intente de nuevo:`;
      }
      email = userMessage.trim();
      userStates[sender].state = "monto";
      return `Ahora, ingrese el monto solicitado (ej: 5000):`;
}

export const monto = (userMessage, monto, userStates) => {
       // Elimina separadores de miles (comas) y convierte a número
       const val = parseFloat(userMessage.replace(/[^0-9.]/g, ""));
  
       // Validar que sea un número dentro del rango permitido
       if (isNaN(val) || val < 1000 || val > 10000) {
         return `❌ Monto no válido. Por favor, ingrese un monto entre 1,000 a 100,000`;
       }
 
       // Guardar el monto si es válido
       monto = val;
       userStates[sender].state = "plazo";
       return `Ahora, ingrese el plazo en meses que desea cancelar (1-17):`;
    
}

export const plazo = (userMessage, plazo_meses, userStates) => {
    const meses = parseInt(userMessage);
        if (isNaN(meses) || meses < 1 || meses > 17) {
          return `❌ Plazo no válido. Intente de nuevo:`;
        }
        plazo_meses = meses; // Corregir aquí: cambiar plazo_mensual por plazo_meses
        const cuota = calculateMonthlyFee(data.monto, meses);
        if (!cuota) return `❌ Error al calcular cuota. Intente con otro plazo.`;
        data.cuota_mensual = cuota;
        userStates[sender].state = "verificacion";
        return `${showVerification(data)}`;
}

export const verificacion = (userMessage, userStates) => {
    const resp = classifyYesNo(userMessage);
        if (resp === true) {
          // Crear directorio temporal si no existe
          const userTempDir = directoryManager.getPath("temp") + "/" + sender;
          fs.mkdirSync(userTempDir, { recursive: true });
  
          userStates[sender].state = "solicitar_documento_foto_ci_an";
          userStates[sender].current_document = "foto_ci_an";
          return getDocumentPrompt("foto_ci_an");
        } else if (resp === false) {
          userStates[sender].state = "correccion";
          return `🔄 ¿Qué dato deseas corregir?\n1️⃣ Nombre\n2️⃣ Cédula\n3️⃣ Dirección\n4️⃣ Email\n5️⃣ Monto\n6️⃣ Plazo\n(Escribe el número de la opción o 'cancelar' para terminar.)`;
        } else {
          return `❓ Responda Sí✔️ o No❌.`;
        }
    }

export const correccion = (userMessage, userStates) => {
    const opcion = parseInt(userMessage);
    if (![1, 2, 3, 4, 5, 6].includes(opcion)) {
      return `❌ Opción no válida, intente de nuevo:`;
    }

    userStates[sender].state = map[opcion];
    return `Ingrese el nuevo valor (o 'cancelar' para terminar):`;
 
}