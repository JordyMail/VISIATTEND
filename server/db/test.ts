// test koneksi database
// jalankan test dengan perintah pnpm run db:test
import { getConnection } from './config.js';

async function testConnection() {
    try {
        console.log('Testing database connection...');
        const pool = await getConnection();
        const result = await pool.request().query('SELECT @@VERSION as version, GETDATE() as currentTime');
        console.log('✅ Database connected successfully!');
        console.log('SQL Server Version:', result.recordset[0].version.split('\n')[0]);
        console.log('Current Time:', result.recordset[0].currentTime);
        process.exit(0);
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        console.log('\nTroubleshooting tips:');
        console.log('1. Make sure SQL Server is running');
        console.log('2. Check credentials in .env file');
        console.log('3. Enable TCP/IP in SQL Server Configuration Manager');
        console.log('4. Check if port 1433 is open in firewall');
        process.exit(1);
    }
}

testConnection();