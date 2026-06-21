import { getConnection } from './config.js';

async function testPointLogs() {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'point_logs'
    `);
    console.log("point_logs columns:", result.recordset);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

testPointLogs();
