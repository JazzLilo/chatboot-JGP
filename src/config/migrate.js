import { getDbConnection } from '../db/db.js';
import fs from 'fs';
import directoryManager from './directory.js';

const runMigrations = async () => {
    const conn = await getDbConnection();
    try {
       
        await conn.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const result = await conn.query(`SELECT * FROM migrations WHERE name = 'initial_migration'`);
        if (result.rows.length > 0) {
            console.log('⚠️ Migración ya ejecutada previamente. Omitiendo.');
            return;
        }

        const pathDB = directoryManager.getPath("db") + "/bd_postgres.sql";
        const sql = fs.readFileSync(pathDB, 'utf8');
        await conn.query(sql);

        await conn.query(`INSERT INTO migrations (name) VALUES ('initial_migration')`);

        console.log('✅ Migraciones ejecutadas correctamente');
    } catch (error) {
        console.error('❌ Error ejecutando migraciones:', error);
    } finally {
        conn.release();
    }
};

runMigrations();
