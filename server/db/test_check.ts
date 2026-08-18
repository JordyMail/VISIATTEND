import { getConnection } from './config';

async function checkAllEvents() {
  try {
    const pool = await getConnection();
    const r = await pool.request().query('SELECT * FROM event_schedule');
    console.log('All Events Count:', r.recordset.length);
    console.log('All Events:', r.recordset);
  } catch(e) {
    console.error('Error:', e);
  }
  process.exit(0);
}
checkAllEvents();
