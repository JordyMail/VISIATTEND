import { getConnection } from './config.js';

async function testColumns() {
    try {
        const pool = await getConnection();
        
        console.log('--- USERS COLUMNS ---');
        const userCols = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'users'
        `);
        console.log(userCols.recordset);

        console.log('--- EXISTING USERS ---');
        const users = await pool.request().query(`
            SELECT id, full_name, email, role, jabatan, is_active FROM users
        `);
        console.log(users.recordset);

        console.log('--- ATTENDANCE RECORD COUNT ---');
        const attCount = await pool.request().query(`
            SELECT COUNT(*) as count FROM attendance
        `);
        console.log(attCount.recordset);

        process.exit(0);
    } catch (error) {
        console.error('Failed:', error);
        process.exit(1);
    }
}

testColumns();
