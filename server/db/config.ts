import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig: sql.config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'YourStrong!Password123',
    server: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'VISIATTEND_DB',
    port: parseInt(process.env.DB_PORT || '1433'),
    options: {
        encrypt: false, // Set ke false untuk local SQL Server
        trustServerCertificate: true,
        enableArithAbort: true
    },
    connectionTimeout: 30000,
    requestTimeout: 30000,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let pool: sql.ConnectionPool | null = null;

export async function getConnection(): Promise<sql.ConnectionPool> {
    if (!pool) {
        try {
            pool = await sql.connect(dbConfig);
            console.log('✅ Database connected successfully to', process.env.DB_NAME);
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