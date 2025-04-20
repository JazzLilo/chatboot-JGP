import { getDbConnection } from './db.js';
import fs from 'fs'
import directoryManager from './directory.js';

const runMigrations = async () => {
    const conn = await getDbConnection();
    try {
        const pathDB = directoryManager.getPath("config") + "/db_postgres.sql"
        const sql = fs.readFileSync(pathDB, 'utf8');
        await conn.query(sql);
        console.log('✅ Migraciones ejecutadas correctamente');
    } catch (error) {
        console.error('❌ Error ejecutando migraciones:', error);
    } finally {
        conn.release();
    }
}

runMigrations();
