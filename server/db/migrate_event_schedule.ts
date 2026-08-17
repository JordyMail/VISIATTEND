// server/db/migrate_event_schedule.ts
// Drops events + event_enrollments, creates event_schedule table
import { getConnection, sql } from './config.js';

async function run() {
  const pool = await getConnection();

  console.log('🔧 Dropping ALL FK constraints referencing events...');

  // Dynamically find and drop every FK that points at events
  await pool.request().query(`
    DECLARE @sql NVARCHAR(MAX) = ''
    SELECT @sql = @sql +
      'ALTER TABLE [' + OBJECT_NAME(fk.parent_object_id) + '] DROP CONSTRAINT [' + fk.name + '];'
    FROM sys.foreign_keys fk
    WHERE fk.referenced_object_id = OBJECT_ID('events')
    IF LEN(@sql) > 0
      EXEC(@sql)
  `);

  console.log('🗑  Dropping event_enrollments...');
  await pool.request().query(`
    IF OBJECT_ID('event_enrollments', 'U') IS NOT NULL
      DROP TABLE event_enrollments
  `);

  console.log('🗑  Dropping events...');
  await pool.request().query(`
    IF OBJECT_ID('events', 'U') IS NOT NULL
      DROP TABLE events
  `);

  console.log('📋 Creating event_schedule...');
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='event_schedule' AND xtype='U')
    CREATE TABLE event_schedule (
      id          INT IDENTITY(1,1) PRIMARY KEY,
      event_code  NVARCHAR(10)  NOT NULL UNIQUE,
      event_name  NVARCHAR(200) NOT NULL,
      description NVARCHAR(500) NULL,
      date_event  DATE          NOT NULL UNIQUE,
      created_at  DATETIME      NOT NULL DEFAULT GETDATE(),
      updated_at  DATETIME      NOT NULL DEFAULT GETDATE()
    )
  `);

  console.log('✅ Migration complete');
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
