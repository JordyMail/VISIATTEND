import { getConnection } from './config.js';

async function queryMembers() {
    try {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT * FROM user_member');
        console.log('Registered user_members:');
        console.table(result.recordset);

        const points = await pool.request().query('SELECT * FROM member_point');
        console.log('\nMember points:');
        console.table(points.recordset);

        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to select data:', error);
        process.exit(1);
    }
}

queryMembers();
