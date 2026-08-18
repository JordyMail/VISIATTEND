import { sql } from "../db/config.js";

export function getWIBDateTime() {
  const now = Date.now();
  const wib = new Date(now + 7 * 3600 * 1000);
  const wibDateStr = wib.toISOString().split("T")[0]; // "YYYY-MM-DD"
  const wibTimeStr = `${String(wib.getUTCHours()).padStart(2, "0")}:${String(wib.getUTCMinutes()).padStart(2, "0")}`; // "HH:MM"
  return { dateStr: wibDateStr, timeStr: wibTimeStr, dateTime: wib };
}

export async function getActiveEvent(pool: any) {
  const { dateStr, timeStr } = getWIBDateTime();

  const result = await pool.request()
    .input("d", sql.Date, dateStr)
    .query(`
      SELECT id, event_code, event_name, start_time, end_time, participant_access, description
      FROM event_schedule
      WHERE date_event = @d
    `);

  const events = result.recordset;

  const activeEvent = events.find((evt: any) => {
    return timeStr >= evt.start_time && timeStr <= evt.end_time;
  });

  return activeEvent || null;
}
