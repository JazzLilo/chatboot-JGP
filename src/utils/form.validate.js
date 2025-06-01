import {classifyYesNo} from '../config/utils.js';

export const verificar_asalariado = (userMessage, userStates) => {
  const respuesta = classifyYesNo(userMessage);
        if (respuesta === true) {
          data.es_asalariado = true;
          userStates[sender].state = "nombre";
          userStates[sender].retries = 0;
          return `Ingrese su nombre completo:`;
        } else if (respuesta === false) {
  
          const message = `❌ Lo sentimos, por ahora solo prestamos para asalariados. Aquí tienes más información:\n\n${getRandomVariation(prompts["requisitos"])}`;
  
          return resetUserState(sender, message)
        } else {
          userStates[sender].retries += 1;
          if (userStates[sender].retries >= 3) {
            userStates[sender].state = "finished";
            userStates[sender].in_application = false;
            delete userStates[sender].timeout;
            delete userStates[sender].retries;
            return `❌ Demasiados intentos inválidos. Por favor, inicie el trámite nuevamente.\n\n${contentMenu}`;
          }
          return `❓ Por favor, responda Sí o No. Intentos: ${userStates[sender].retries}/3.`;
        }
}
