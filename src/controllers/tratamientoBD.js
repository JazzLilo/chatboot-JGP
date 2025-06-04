import { getDbConnection } from "../db/db.js";

export class ApplicationData {
    constructor() {
        this.solicitudId = null;
        this.es_asalariado = null;
        this.nombre_completo = null;
        this.cedula = null;
        this.direccion = null;
        this.latitud = null;
        this.longitud = null;
        this.email = null;
        this.monto = null;
        this.rubro = null;
        this.plazo_meses = null;
        this.cuota_mensual = null;
        this.sueldo = null;
        this.ingreso_familiar = null;
        this.cantidad_deuda = null;
        this.monto_pago_deuda = null;
        this.max_loan_amount = null;
        this.foto_ci_an = null;
        this.foto_ci_re = null;
        this.croquis = null;
        this.boleta_pago1 = null;
        this.boleta_pago2 = null;
        this.boleta_pago3 = null;
        this.factura = null;        
        this.gestora_publica_afp = null;
        this.custodia = null;
        this.boleta_impuesto = null;
        this.tipo_documento_custodia = null;
        
    }
}

export const insertSolicitud = async (data) => {
    const conn = await getDbConnection();
    if (!conn) return false;
    try {
        console.log('Datos a insertar:', {
            nombre: data.nombre_completo,
            cedula: data.cedula,
            direccion: data.direccion,
            email: data.email,
            monto: data.monto,
            plazo: data.plazo_meses,
            cuota: data.cuota_mensual,
            latitud: data.latitud,
            longitud: data.longitud,
            rubro: data.rubro,
            deudas: data.cantidad_deuda,
            pago_deudas: data.monto_pago_deuda,
            sueldo: data.sueldo,
            ingreso_familiar: data.ingreso_familiar,
            tipo_documento_custodia: data.tipo_documento_custodia
        });

        await conn.query("BEGIN");

        const sql = `
            INSERT INTO solicitud (
                nombre_completo, 
                cedula, 
                direccion, 
                email, 
                monto, 
                plazo_meses, 
                cuota_mensual,
                rubro,
                cantidad_deudas,
                monto_mensual_deudas,
                ingreso_familiar,
                estado,
                latitud,
                longitud,
                tipo_documento_custodia,
                sueldo
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id;
        `;
        
        // Procesar valores opcionales
        const cantidadDeudas = data.cantidad_deuda ? parseInt(data.cantidad_deuda) : 0;
        const montoDeudas = data.monto_pago_deuda || 0;
        const ingresoFamiliar = data.ingreso_familiar || 0;

        const values = [
            data.nombre_completo,
            data.cedula,
            data.direccion,
            data.email,
            data.monto,
            data.plazo_meses,
            data.cuota_mensual,
            data.rubro,
            cantidadDeudas,
            montoDeudas,
            ingresoFamiliar,
            'pendiente',
            data.latitud,
            data.longitud,
            data.tipo_documento_custodia,
            data.sueldo
        ];

        // Validaciones
        if (!data.nombre_completo || !data.cedula || !data.direccion || !data.email) {
            throw new Error("Datos personales incompletos");
        }

        if (!data.monto || !data.plazo_meses || !data.cuota_mensual || !data.rubro) {
            throw new Error("Datos financieros incompletos");
        }

        if (data.monto <= 0 || data.plazo_meses < 1 || data.plazo_meses > 17) {
            throw new Error(`Datos inválidos: monto=${data.monto}, plazo=${data.plazo_meses}`);
        }

        const result = await conn.query(sql, values);
        const solicitudId = result.rows[0].id;

         const sqlUbicacion = `
            INSERT INTO ubicacion_archivo (
                solicitud_id,
                foto_ci_an,
                foto_ci_re,
                croquis,
                boleta_pago1,
                boleta_pago2,
                boleta_pago3,
                factura,
                gestora_publica_afp,
                documento_custodia,
                boleta_impuesto
            ) VALUES ($1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
        `;
        await conn.query(sqlUbicacion, [solicitudId]);


        await conn.query("COMMIT");
        console.log(`✅ Solicitud insertada con ID: ${solicitudId}`);
        return solicitudId;
    } catch (err) {
        await conn.query("ROLLBACK");
        console.error("❌ Error detallado:", {
            message: err.message,
            data: {
                monto: data.monto,
                plazo: data.plazo_meses,
                rubro: data.rubro
            }
        });
        return false;
    } finally {
        conn.release();
    }
}

export const insertFileLocation = async (solicitudId, filePath, fileType) => {
    const conn = await getDbConnection();
    if (!conn) return false;
    try {
        const columnMap = {
            "Foto CI Anverso": "foto_ci_an",
            "Foto CI Reverso": "foto_ci_re",
            "Croquis": "croquis",
            "Boleta Pago 1": "boleta_pago1",
            "Boleta Pago 2": "boleta_pago2",
            "Boleta Pago 3": "boleta_pago3",
            "Factura": "factura",
            "Gestora Pública AFP": "gestora_publica_afp",
            "Custodia": "documento_custodia",
            "Boleta Impuesto": "boleta_impuesto"
        };

        const columnName = columnMap[fileType];
        if (!columnName) {
            throw new Error(`Tipo de archivo desconocido: ${fileType}`);
        }

        const sql = `
            UPDATE ubicacion_archivo
            SET ${columnName} = $1
            WHERE solicitud_id = $2;
        `;
        const values = [filePath, solicitudId];
        await conn.query(sql, values);
        console.log(`Archivo ${fileType} actualizado en la solicitud ID: ${solicitudId}`);
        return true;
    } catch (err) {
        console.error("Error al actualizar ubicación del archivo:", err);
        return false;
    } finally {
        conn.release();
    }
}