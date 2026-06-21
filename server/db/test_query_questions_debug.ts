import { getConnection, sql } from './config.js';

async function testDebug() {
  try {
    const pool = await getConnection();
    
    // Simulating GET /api/user-dashboard/questions
    const memberId = '004';
    const attendanceDate = new Date('2026-06-21T02:48:02.020Z');
    
    const result = await pool
      .request()
      .input("memberId", sql.NVarChar, memberId)
      .input("attendanceDate", sql.DateTime, attendanceDate)
      .query(`
        SELECT q.id, q.title, q.start_date, CAST(q.start_date AS DATE) as q_date, 
          CAST(@attendanceDate AS DATE) as att_date
        FROM questions q
        WHERE q.is_active = 1
          AND CAST(q.start_date AS DATE) = CAST(@attendanceDate AS DATE)
      `);
      
    console.log("Matched questions:", result.recordset);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

testDebug();
