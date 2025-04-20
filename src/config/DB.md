/**
 * Estructura de Base de Datos
 * ==========================
 * 
 * Tabla: solicitud
 * ---------------
 * Almacena información principal de las solicitudes de préstamo
 * Campos:
 * - id: Identificador único
 * - nombre_completo: Nombre del solicitante
 * - cedula: Número de identificación
 * - direccion: Dirección física
 * - email: Correo electrónico
 * - monto: Cantidad solicitada
 * - plazo_meses: Duración del préstamo
 * - cuota_mensual: Pago mensual calculado
 * - fecha_solicitud: Timestamp de la solicitud
 * - estado: Estado actual de la solicitud
 * 
 * Tabla: ubicacion_archivo
 * -----------------------
 * Gestiona las ubicaciones de los documentos subidos
 * Campos:
 * - id: Identificador único
 * - solicitud_id: Relación con solicitud
 * - foto_ci_an: Ruta CI anverso
 * - foto_ci_re: Ruta CI reverso
 * - croquis: Ruta croquis
 * - boleta_pago1/2/3: Rutas boletas
 * - factura: Ruta factura servicios
 * - gestora_publica_afp: Ruta documento AFP
 * 
 * Relaciones y Restricciones
 * -------------------------
 * - Clave foránea: ubicacion_archivo.solicitud_id → solicitud.id
 * - Índices: cedula, fecha_solicitud, estado
 * - Restricciones: montos positivos, plazos válidos
 */
