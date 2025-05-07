export const saveMessage = async (req, res) => {
  try {
    const { message, sender } = req.body;
    if (!message || !sender) {
      return res.status(400).json({ reply: "Datos incompletos" });
    }
    // 1. Si es la primera vez que escribe, entramos a INIT
    if (!userStates[sender]) {
      userStates[sender] = {
        state: "INIT",
        data: new ApplicationData(), // **Inicializar con ApplicationData**
        in_application: false,
        cancelAttempts: 0, // Inicializar contador de cancelaciones
        timeout: setTimeout(() => {
          userStates[sender].state = "finished";
          userStates[sender].in_application = false;
          delete userStates[sender].timeout;
        }, 30 * 60 * 1000), // 30 minutos de inactividad
      };

      // Registrar la conversación
      logConversation(sender, message, "usuario");

      // Retornamos saludo + menú
      const initialMenu =
        getRandomVariation(prompts["saludo"]) + "\n" + contentMenu;

      // Registrar la respuesta del bot
      logConversation(sender, initialMenu, "bot");

      return res.json({ reply: initialMenu });
    }

    // 2. Si el usuario está en estado INIT
    if (userStates[sender].state === "INIT") {
      // Ver si el usuario escribió un número (menú) o algo libre
      const num = parseInt(message);
      if (!isNaN(num)) {
        // Es un número, así que escojamos la acción
        switch (num) {
          case 1: {
            const reply = `${getRandomVariation(
              prompts["informacion_general"]
            )}\n${contentMenu}`;
            logConversation(sender, reply, "bot");
            return res.json({ reply: reply });
          }
          case 2: {
            const reply = `${getRandomVariation(
              prompts["requisitos"]
            )}\n${contentMenu}`;
            logConversation(sender, reply, "bot");
            return res.json({ reply: reply });
          }
          case 3: {
            // Mostrar contenido completo de "Sucursales_y_Horarios.json"
            const reply = `${prompts["sucursales_horarios"].content
              }\n${contentMenu}`;
            logConversation(sender, reply, "bot");
            return res.json({ reply: reply });
          }
          case 4: {
            // Inicia el trámite
            const tramiteResponse = await handleVirtualApplication(
              sender,
              message
            );
            logConversation(sender, tramiteResponse, "bot");
            return res.json({ reply: `${tramiteResponse}` }); // No añadir menú
          }
          default: {
            const reply = `Opción inválida. Por favor, selecciona una opción de 1-4.\n${contentMenu}`;
            logConversation(sender, reply, "bot");
            return res.json({ reply: reply });
          }
        }
      } else {
        // Texto libre: lo clasificamos
        const respuesta = await handleUserMessage(sender, message);
        return res.json({ reply: respuesta });
      }
    }

    // 3. Si ya tiene un estado distinto a INIT (ej: está en trámite o algo)
    if (isInApplicationProcess(userStates, sender)) {
      const respuesta = await continueVirtualApplication(
        userStates[sender].state,
        userStates[sender].data,
        sender,
        message,
        userStates,
        prompts
      );
      return res.json({ reply: `${respuesta}` });
    } else if (userStates[sender] && userStates[sender].state !== "finished") {
      const respuesta = await handleUserMessage(sender, message);
      return res.json({ reply: respuesta });
    } else {
      const waitMessage = `⏳ El chatbot se está reiniciando y no puede procesar nuevos mensajes ahora. Por favor, espera 5 minutos antes de intentar nuevamente.`;
      logConversation(sender, waitMessage, "bot");
      return res.json({ reply: waitMessage });
    }    
  } catch (error) {
    console.error("Error en /message:", error);
    return res.status(500).json({ reply: "Error interno del servidor" });
  }
}