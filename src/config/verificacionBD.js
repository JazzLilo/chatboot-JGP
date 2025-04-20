import { getDbConnection } from '../db/db.js'

export const verifyConnection = async () => {
    let client;
    try {
        client = await getDbConnection();
        
        // Verificar versión de PostgreSQL
        const versionResult = await client.query('SELECT version()');
        console.log('📊 Versión PostgreSQL:', versionResult.rows[0].version);
        
        // Verificar hora del servidor
        const timeResult = await client.query('SELECT NOW()');
        console.log('🕒 Hora del servidor:', timeResult.rows[0].now);
        
        // Verificar tamaño de la base de datos
        const dbSizeResult = await client.query("SELECT pg_size_pretty(pg_database_size(current_database()))");
        console.log('💾 Tamaño de la BD:', dbSizeResult.rows[0].pg_size_pretty);
        
        console.log('✅ Verificación completa exitosa');
        return true;
    } catch (error) {
        console.error('❌ Error durante la verificación:', error.message);
        return false;
    } finally {
        if (client) {
            client.release();
        }
    }
}

verifyConnection().then(success => {
    if (!success) {
        process.exit(1);
    }
});
