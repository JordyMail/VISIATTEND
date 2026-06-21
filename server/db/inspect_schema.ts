import { getConnection } from './config.js';
import sql from 'mssql';

async function inspectTable() {
    try {
        console.log('Inspecting user_member table...');
        const pool = await getConnection();
        
        // 1. Get column info
        console.log('\n--- Columns in user_member ---');
        const cols = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'user_member'
        `);
        console.table(cols.recordset);

        // 2. Get constraints/indexes
        console.log('\n--- Indexes and Constraints on user_member ---');
        const indexes = await pool.request().query(`
            SELECT 
                i.name AS IndexName,
                i.is_unique AS IsUnique,
                i.is_primary_key AS IsPrimaryKey,
                COL_NAME(ic.object_id, ic.column_id) AS ColumnName
            FROM sys.indexes i
            INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
            WHERE i.object_id = OBJECT_ID('user_member')
        `);
        console.table(indexes.recordset);

        // 3. Check duplicate email or name
        console.log('\n--- Existing records matching user input ---');
        const dupes = await pool.request()
            .input('email', sql.NVarChar, 'mendsilvan@gmail.com')
            .query(`
                SELECT * FROM user_member WHERE email = @email OR name = 'silfan Desra'
            `);
        console.log('Matching records:', dupes.recordset);

        process.exit(0);
    } catch (error) {
        console.error('❌ Inspection failed!', error);
        process.exit(1);
    }
}

inspectTable();
