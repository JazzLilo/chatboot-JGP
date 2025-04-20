/**
 * Chatbot WhatsApp - Estructura del Proyecto
 * =========================================
 * 
 * /services/
 * ----------
 * - whatsappService.js: Maneja la conexión y comunicación con WhatsApp
 * - messageHandler.js: Procesa y gestiona los mensajes entrantes
 * - userStateService.js: Gestiona el estado de las conversaciones de usuarios
 * - documentService.js: Maneja el procesamiento y almacenamiento de documentos
 * - promptService.js: Gestiona las respuestas predefinidas y variaciones
 * - ai.js: Maneja la integración con servicios de IA (Gemini)
 * 
 * /config/
 * --------
 * - utils.js: Funciones utilitarias generales
 * - db.js: Configuración y conexión a la base de datos
 * - bd_postgres.sql: Esquema de la base de datos
 * 
 * /prompts/
 * ---------
 * Archivos JSON con respuestas predefinidas para diferentes situaciones
 * 
 * Flujo de Trabajo Principal
 * -------------------------
 * 1. Usuario envía mensaje → whatsappService.js
 * 2. Mensaje procesado → messageHandler.js
 * 3. Estado gestionado → userStateService.js
 * 4. Respuesta generada → promptService.js + ai.js
 * 5. Documentos procesados → documentService.js
 * 6. Datos almacenados → db.js
 */
