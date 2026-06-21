// server/db/migrate_event_date.ts
// Run: npx tsx server/db/migrate_event_date.ts
import { getConnection } from "./config.js";

async function migrateEventDate() {
  console.log("🔄 Adding event_date column to events table...");
  const pool = await getConnection();

  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('events') AND name='event_date')
      ALTER TABLE events ADD event_date DATE NULL;
  `);

  console.log("✅ Migration complete: event_date added to events.");
  process.exit(0);
}

migrateEventDate().catch((e) => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
