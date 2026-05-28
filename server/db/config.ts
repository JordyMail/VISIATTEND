// server/db/config.ts
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig: sql.config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '1433'),
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
    },
};

let pool: sql.ConnectionPool | null = null;

export async function getConnection(): Promise<sql.ConnectionPool> {
    if (!pool) {
        try {
            console.log('📦 Connecting to database...');
            console.log(`🔧 Target: ${dbConfig.server}:${dbConfig.port} as ${dbConfig.user}`);
            pool = await sql.connect(dbConfig);
            console.log('✅ Database connected successfully to', dbConfig.database);
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            throw error;
        }
    }
    return pool;
}

export async function closeConnection(): Promise<void> {
    if (pool) {
        await pool.close();
        pool = null;
        console.log('Database connection closed');
    }
}

export { sql };