# ChatBootJGP


## Indice
- [Estructura del proyecto](#estructura-del-proyecto)
- [Archivos clave](#archivos-clave)
- [Operación del bot](#operación-del-bot)

## Estructura del proyecto

```
src/
├── controllers/  # Lógica básica y gestión de mensajes
├── config/       # Archivos de configuración
├── db/           # Esquema y conexión de la base de datos
├── utils/        # Funciones auxiliares y constantes
├── assets/       # Almacenamiento de documentos y prompts
├── route/        # endPoints de la API
├── solicitudes/  # Registros de conversaciones
└── temp/         # Almacenamiento temporal de archivos
```

### Detalles del directorio

- **controllers/**: Contiene la lógica principal para la conexión de WhatsApp, la gestión de mensajes y la integración con IA.
- **config/**: Configuraciones generales y ajustes de la base de datos.
- **db/**: Esquema de la base de datos PostgreSQL y gestión de la conexión.
- **utils/**: Funciones auxiliares, constantes y lógica de validación.
- **assets/**: Almacenamiento para documentos de usuario y plantillas de solicitud.
- **routes/**: Puntos finales de la API para la aplicación.
- **solicitudes/**: Almacenamiento para registros de conversaciones y aplicaciones de usuario.
- **temp/**: Almacenamiento temporal para el procesamiento de documentos.

### Arquitectura detallada de componentes

#### Capa de controladores
- **conexionBaileys.js**: Gestor de conexión y comunicación de WhatsApp
- **Controladores de usuario**:
- user.controller.js: Gestión de usuarios principales
- user.state.controller.js: Gestión del estado de usuario
- **Controladores de documentos**:
- document.process.controller.js: Procesamiento de documentos
- document.gateway.js: Gestión de la pasarela de documentos
- **Integración con IA**:
- gemini.controller.js: Integración con IA de Gemini
- Clasificación de intenciones
- Extracción de ubicación
- Validación de documentos
- **Controladores de base de datos**:
- tratamientoDB.js: Operaciones con base de datos
- session.controller.js: Gestión de sesiones de usuario

#### Capa de configuración
- **utils.js**: Funciones de utilidad generales
- Cálculo de la cuota mensual
- Clasificación de respuestas Sí/No
- Selección de variación aleatoria
- **directory.js**: Configuración del directorio
- **migrate.js**: Migración de base de datos Manejo

#### Gestión de Activos
- **prompts/**: Plantillas de respuesta JSON
- Saludo_y_Conduccion.json: Respuestas de saludo
- prompt.json: Respuestas a situaciones generales
- requisitos.json: Documentación de requisitos

#### Capa de Base de Datos
- **db.js**: Configuración y conexión a la base de datos
- **bd_postgres.sql**: Definición del esquema de la base de datos

#### Capa de Utilidades
- **logger.js**: Sistema de registro
- **constant.js**: Constantes del proyecto
- **document.js**: Utilidades de manejo de documentos
- **message.js**: Utilidades de manejo de mensajes
- Generación de contenido del menú
- Mensajes de cancelación
- Mensajes del sistema
- **prompts.js**: Gestión de conversaciones



## Archivos Clave

### index.js
Punto de entrada de la aplicación.

### conexionBaileys.js
Gestiona la conexión de WhatsApp mediante la biblioteca Baileys, gestiona los eventos de conexión y el procesamiento de mensajes.

### gemini.controller.js
Se integra con la IA Gemini de Google para la clasificación de intenciones de mensajes y la validación de documentos.

### message.controller.js
Lógica principal de procesamiento y enrutamiento de mensajes; gestiona los mensajes entrantes y las respuestas.

### conversation.controller.js
Gestiona el flujo de conversaciones, las transiciones de estado y las interacciones del usuario.

### bd_postgres.sql
Definición del esquema de la base de datos para almacenar solicitudes de préstamo y documentos relacionados.
## Operación del Bot

1. **Conexión de WhatsApp**
- Inicializa la conexión mediante la biblioteca Baileys
- Gestiona la autenticación con código QR
- Gestiona el estado de la conexión y la reconexión

2. **Procesamiento de Mensajes**
- Recibe mensajes entrantes
- Clasifica la intención mediante IA de Gemini
- Envía los mensajes a los gestores adecuados

3. **Gestión de Documentos**
- Recopila la documentación necesaria
- Valida documentos mediante IA
- Almacena archivos de forma segura

4. **Flujo de Conversación**
- Gestiona el estado y el progreso del usuario
- Gestiona las entradas y validaciones del usuario
- Proporciona respuestas e indicaciones adecuadas

5. **Almacenamiento de Datos**
- Almacena los datos de la aplicación en PostgreSQL
- Gestiona las referencias de archivos y los metadatos
- Rastrea el historial de conversaciones



