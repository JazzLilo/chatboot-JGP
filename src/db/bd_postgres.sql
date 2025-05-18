-- Crear la tabla solicitud
CREATE TABLE IF NOT EXISTS solicitud (
    id SERIAL PRIMARY KEY, -- Usar SERIAL para generación automática de IDs
    nombre_completo VARCHAR(100) NOT NULL,
    cedula VARCHAR(20) NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    email VARCHAR(100) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    plazo_meses INT NOT NULL,
    rubro VARCHAR(50) NOT NULL,
    cuota_mensual DECIMAL(10,2) NOT NULL,
    cantidad_deudas INT DEFAULT 0,
    monto_mensual_deudas DECIMAL(10,2) DEFAULT 0,
    sueldo DECIMAL(10,2) DEFAULT 0,
    ingreso_familiar DECIMAL(10,2) DEFAULT 0,
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'pendiente',
    latitud DECIMAL(10, 8) DEFAULT NULL,
    longitud DECIMAL(11, 8) DEFAULT NULL,
    tipo_documento_custodia VARCHAR(50) DEFAULT NULL,
    CONSTRAINT check_plazo CHECK (plazo_meses >= 1 AND plazo_meses <= 17),
    CONSTRAINT check_monto CHECK (monto > 0),
    CONSTRAINT check_cuota CHECK (cuota_mensual > 0)
);

-- Crear la tabla ubicacion_archivo
CREATE TABLE IF NOT EXISTS ubicacion_archivo (
    id SERIAL PRIMARY KEY, -- Usar SERIAL para generación automática de IDs
    solicitud_id INT NOT NULL,
    foto_ci_an VARCHAR(255) DEFAULT NULL,
    foto_ci_re VARCHAR(255) DEFAULT NULL,
    croquis VARCHAR(255) DEFAULT NULL,
    boleta_pago1 VARCHAR(255) DEFAULT NULL,
    boleta_pago2 VARCHAR(255) DEFAULT NULL,
    boleta_pago3 VARCHAR(255) DEFAULT NULL,
    factura VARCHAR(255) DEFAULT NULL,
    gestora_publica_afp VARCHAR(255) DEFAULT NULL,
    documento_custodia VARCHAR(255) DEFAULT NULL,
    boleta_impuesto VARCHAR(255) DEFAULT NULL,
    FOREIGN KEY (solicitud_id) REFERENCES solicitud(id) ON DELETE CASCADE
);

-- Crear índices para mejorar el rendimiento en búsquedas frecuentes
CREATE INDEX idx_cedula ON solicitud(cedula);
CREATE INDEX idx_fecha ON solicitud(fecha_solicitud);
CREATE INDEX idx_estado ON solicitud(estado);
