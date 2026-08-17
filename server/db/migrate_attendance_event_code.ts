// server/db/migrate_attendance_event_code.ts
// Run: npx tsx server/db/migrate_attendance_event_code.ts
import { getConnection, sql } from './config.js';

async function run() {
  const pool = await getConnection();

  console.log('🔧 Widening event_schedule.event_code to NVARCHAR(20)...');
  await pool.request().query(`
    ALTER TABLE event_schedule ALTER COLUMN event_code NVARCHAR(20) NOT NULL
  `);

  console.log('📋 Adding attendance_member.event_code column...');
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID('attendance_member') AND name = 'event_code'
    )
      ALTER TABLE attendance_member ADD event_code NVARCHAR(20) NULL
  `);

  console.log('🔗 Backfilling event_code for existing attendance_member rows...');
  await pool.request().query(`
    UPDATE am
    SET am.event_code = es.event_code
    FROM attendance_member am
    JOIN event_schedule es ON es.date_event = am.attendance_day
    WHERE am.event_code IS NULL
  `);

  console.log('✅ Migration complete');
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
