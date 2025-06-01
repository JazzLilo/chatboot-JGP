

export const normalize = (text) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "");
}


export const isInApplicationProcess =(userStates, sender) => {
  return (
    userStates[sender] &&
    userStates[sender].in_application &&
    userStates[sender].state !== "finished"
  );
}


import fetch from 'node-fetch';

export const getLatLongFromLink = async (link) =>  {
  try {
    // Hacemos un HEAD para seguir redirecciones
    const res = await fetch(link, { method: 'HEAD', redirect: 'follow' });
    const finalUrl = res.url;

    // Buscamos @lat,long en la URL final
    const m = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m) {
      return { latitude: parseFloat(m[1]), longitude: parseFloat(m[2]) };
    }
  } catch (e) {
    console.error('Error resolviendo Maps link:', e);
  }
  return null;
}

import { contentMenu } from '../utils/message.js';
export const exededRetryLimit = (userStates, sender) => {
  if (userStates[sender].retries >= 3) {
            userStates[sender].state = "baned";
            userStates[sender].in_application = false;
            delete userStates[sender].timeout;
            delete userStates[sender].timeoutFinish;
            delete userStates[sender].timeoutBan;
            delete userStates[sender].retries;
            return `❌ Demasiados intentos inválidos. Por favor, inicie el trámite nuevamente.\n\n${contentMenu}`;
    }
}