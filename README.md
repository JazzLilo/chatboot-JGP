/**
 * Chatbot WhatsApp - Estructura del Proyecto
 * =========================================
 * 
 * src/controllers/
 * ----------
 * - conexionBaileys.js: Maneja la conexión y comunicación con WhatsApp
 * - user.*.js: Gestiona el estado, los datos y las conversaciones de usuarios
 *   - user.controller.js: Controlador de usuario
 *   - user.state.controller.js: Controlador de estado de usuario
 * - document.*.js: Maneja el procesamiento, la validacion y almacenamiento de documentos
 *   - document.process.controller.js: Controlador de procesamiento de documentos
 *   - document.gateway.js: Controlador de gateway de documentos
 * - promptService.js: Gestiona las respuestas predefinidas y variaciones
 * - gemini.controller.js: Maneja la integración con servicios de IA (Gemini)
 *   - getLatLongFromLink: Obtiene latitud y longitud desde un enlace
 *   - classifyIntent: Clasifica la intención del usuario
 * - tratamientoDB.js: Maneja el almacenamiento de los datos en la db
 * - session.controller.js : Genera la carpeta del usuario
 * 
 * /config/
 * --------
 * - utils.js: Funciones utilitarias generales
 *   - calculateMonthlyFee: Calcula cuota mensual según monto y plazo
 *   - classifyYesNo: Interpreta respuestas afirmativas/negativas
 *   - getRandomVariation: Selección aleatoria de variaciones
 * - directory.js : Configuracion de directorios
 * - migrate.js : Creacion de la db 
 *
 * src/assets/prompts/propmts
 * ---------
 * Archivos JSON con respuestas predefinidas para diferentes situaciones
 *   - Saludo_y_Conduccion.json: Respuestas para saludos y conducción
 *   - prompt.json: Respuestas para diferentes situaciones
 *   - requisitos.json: Requisitos para iniciar un trámite
 *
 * /src/db/
 * ---------
 * - db.js: Configuración y conexión a la base de datos
 * - bd_postgres.sql: Esquema de la base de datos
 *
 * /src/utils/
 * ----------
 * - logger.js: Registro de logs
 * - constant.js: Constantes del proyecto
 *   - DOCUMENT_TYPES: Tipos de documentos
 * - document.js: Funciones para manejar documentos
 * - message.js: Funciones para manejar mensajes
 *   - contentMenu: Genera menú principal formateado
 *   - messageCancel: Mensaje de cancelación
 *   - messageCancelFull: Mensaje de cancelación completo
 *   - messageCancelSuccess: Mensaje de cancelación exitoso
 *   - messageNotTrained: Mensaje de no entrenado
 * - prompt.js: Funciones para manejar prompts
 *   - map: Función para mapear prompts
 * - conversation.prompts.js: Funciones para manejar conversaciones
 *   - getDocumentPrompt: Obtiene prompt de documento
 *   - getNextDocument: Obtiene próximo documento
 *   - dataFieldAssignment: Asignación de campos de datos
 *   - getDocumentDescription: Obtiene descripción de documento
 * - document.flow.js: Funciones para manejar flujo de documentos
 *   - getDocumentState: Obtiene estado de documento
 *   - getNextDocumentKey: Obtiene clave del próximo documento
 *
 * Flujo de Trabajo Principal
 * -------------------------
 * 1. Usuario envía mensaje → conexionBaileys.js
 * 2. Mensaje procesado → messageHandler.js
 * 3. Estado gestionado → userStateService.js
 * 4. Respuesta generada → promptService.js + ai.js
 * 5. Documentos procesados → documentService.js
 * 6. Datos almacenados → db.js
 */