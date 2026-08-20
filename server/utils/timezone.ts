import { sql } from "../db/config.js";

export function getWIBDateTime() {
  const now = Date.now();
  const wib = new Date(now + 7 * 3600 * 1000);
  const wibDateStr = wib.toISOString().split("T")[0]; // "YYYY-MM-DD"
  const wibTimeStr = `${String(wib.getUTCHours()).padStart(2, "0")}:${String(wib.getUTCMinutes()).padStart(2, "0")}`; // "HH:MM"
  return { dateStr: wibDateStr, timeStr: wibTimeStr, dateTime: wib };
}

function timeToMinutes(value: unknown): number | null {
  if (value instanceof Date) {
    return value.getUTCHours() * 60 + value.getUTCMinutes();
  }

  const text = String(value ?? "").trim();
  const timeMatch = text.match(/(?:T|\s)?(\d{1,2}):(\d{2})/);
  if (!timeMatch) return null;

  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export async function getActiveEvent(pool: any, memberId?: string | null) {
  const { dateStr, timeStr } = getWIBDateTime();
  const currentMinutes = timeToMinutes(timeStr) ?? 0;

  const result = await pool.request()
    .input("d", sql.Date, dateStr)
    .input("memberId", sql.NVarChar, memberId ?? null)
    .query(`
      SELECT id, event_code, event_name, start_time, end_time, participant_access, description
      FROM event_schedule
      WHERE date_event = @d
        AND (
          @memberId IS NULL
          OR participant_access = 'Everyone'
          OR (
            participant_access = 'Selected Members'
            AND EXISTS (
              SELECT 1 FROM event_participants ep
              WHERE ep.event_id = event_schedule.id AND ep.member_id = @memberId
            )
          )
          OR (
            participant_access = 'Excluded Members'
            AND NOT EXISTS (
              SELECT 1 FROM event_participants ep
              WHERE ep.event_id = event_schedule.id AND ep.member_id = @memberId
            )
          )
        )
    `);

  const events = result.recordset;

  const activeEvent = events.find((evt: any) => {
    const startMinutes = timeToMinutes(evt.start_time);
    const endMinutes = timeToMinutes(evt.end_time);
    return startMinutes !== null && endMinutes !== null
      && currentMinutes >= startMinutes
      && currentMinutes <= endMinutes;
  });

  return activeEvent || null;
}
