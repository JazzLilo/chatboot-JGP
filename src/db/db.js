import pkg from 'pg';
import { DATABASE } from '../config/index.js';

const { Pool } = pkg;
const pool = new Pool({ connectionString: DATABASE, ssl: false });

export const getDbConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Conexión exitosa con la base de datos PostgreSQL');
        return client;
    } catch (error) {
        console.error('❌ Error de conexión:', error.message);
        throw error;
    }
}



