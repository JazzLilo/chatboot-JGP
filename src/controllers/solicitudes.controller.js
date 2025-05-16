import { getDbConnection } from "../db/db.js";

export const getSolicitudes = async (req, res) => {
  try {
    const conn = await getDbConnection();
    if (!conn) {
      return res
        .status(500)
        .json({ error: "Error al conectar con la base de datos" });
    }

    const sql = `
            SELECT 
                s.id AS "id",
                s.nombre_completo AS "nombre_completo",
                s.cedula AS "cedula",
                s.direccion AS "direccion",
                s.email AS "email",
                s.monto AS "monto",
                s.plazo_meses AS "plazo_meses",
                s.rubro AS "rubro",
                s.cuota_mensual AS "cuota_mensual"
            FROM solicitud s
        `;

    const result = await conn.query(sql);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error al obtener solicitudes:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}