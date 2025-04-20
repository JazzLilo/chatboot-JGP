import directoryManager from '../config/directory.js';
import fs from 'fs';
import path from 'path';

// ------------ FUNCIÓN PARA REGISTRAR CONVERSACIÓN -----------
export const logConversation = (sender, message, type) => {
    try {
      const today = new Date().toISOString().split("T")[0];
  
      const basePath = directoryManager.getPath('solicitudes') + "/" + today + "/" + sender;
      fs.mkdirSync(basePath, { recursive: true });
  
      const conversationFileName = `conversation.txt`;
      const conversationFilePath = path.join(basePath, conversationFileName);
  
      const timestamp = new Date().toLocaleString();
      const formattedMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}\n`;
  
      fs.appendFileSync(conversationFilePath, formattedMessage, { encoding: "utf-8" });
    } catch (error) {
      console.log(`Error al registrar la conversación: ${error}`);
    }
  }
  