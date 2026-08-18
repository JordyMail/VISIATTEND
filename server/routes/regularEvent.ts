// server/routes/regularEvent.ts
import { RequestHandler } from "express";
import { getConnection, sql } from "../db/config.js";

// Local helper to write to activity_logs
async function writeLog(
  pool: any,
  userId: number | null,
  action: string,
  entityType: string,
  entityId: number | null,
  desc: string,
  ip?: string
) {
  try {
    await pool
      .request()
      .input("u", sql.Int, userId)
      .input("a", sql.NVarChar, action)
      .input("et", sql.NVarChar, entityType)
      .input("ei", sql.Int, entityId)
      .input("d", sql.NVarChar, desc.slice(0, 500))
      .input("ip", sql.NVarChar, ip || null)
      .query(
        `INSERT INTO activity_logs (user_id,action,entity_type,entity_id,description,ip_address,created_at)
         VALUES (@u,@a,@et,@ei,@d,@ip,GETDATE())`
      );
  } catch {
    /* non-fatal */
  }
}

// GET /api/regular-events
export const handleGetRegularEvents: RequestHandler = async (req: any, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(
      `SELECT * FROM regular_event ORDER BY event_code ASC`
    );
    res.json({ success: true, data: result.recordset });
  } catch (error: any) {
    console.error("[GET REGULAR EVENTS]", error);
    res.status(500).json({ success: false, message: "DB error" });
  }
};

// POST /api/regular-events
export const handleCreateRegularEvent: RequestHandler = async (req: any, res) => {
  try {
    const { eventName } = req.body;
    if (!eventName || !eventName.trim()) {
      return res.status(400).json({ success: false, message: "eventName is required" });
    }

    const pool = await getConnection();

    // Generate event code automatically by finding the maximum numerical event code and incrementing
    const maxResult = await pool.request().query(`
      SELECT ISNULL(MAX(TRY_CAST(event_code AS INT)), 0) AS maxCode
      FROM regular_event
    `);
    const nextVal = (maxResult.recordset[0]?.maxCode || 0) + 1;
    const nextEventCode = String(nextVal).padStart(3, "0");

    const result = await pool.request()
      .input("ec", sql.NVarChar, nextEventCode)
      .input("en", sql.NVarChar, eventName.trim())
      .query(`
        INSERT INTO regular_event (event_code, event_name)
        OUTPUT INSERTED.*
        VALUES (@ec, @en)
      `);

    const newEvent = result.recordset[0];
    await writeLog(
      pool,
      req.user?.id || null,
      "CREATE_REGULAR_EVENT",
      "regular_event",
      newEvent.id,
      `Created regular event: ${eventName.trim()} (${nextEventCode})`,
      req.ip
    );

    res.status(201).json({ success: true, data: newEvent });
  } catch (error: any) {
    console.error("[CREATE REGULAR EVENT]", error);
    res.status(500).json({ success: false, message: error.message || "DB error" });
  }
};

// PUT /api/regular-events/:id
export const handleUpdateRegularEvent: RequestHandler = async (req: any, res) => {
  try {
    const { eventName } = req.body;
    if (!eventName || !eventName.trim()) {
      return res.status(400).json({ success: false, message: "eventName is required" });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, req.params.id)
      .input("en", sql.NVarChar, eventName.trim())
      .query(`UPDATE regular_event SET event_name=@en WHERE id=@id`);

    if (!result.rowsAffected[0]) {
      return res.status(404).json({ success: false, message: "Regular Event not found" });
    }

    await writeLog(
      pool,
      req.user?.id || null,
      "UPDATE_REGULAR_EVENT",
      "regular_event",
      parseInt(req.params.id),
      `Updated regular event name: ${eventName.trim()}`,
      req.ip
    );

    res.json({ success: true, message: "Regular Event updated" });
  } catch (error: any) {
    console.error("[UPDATE REGULAR EVENT]", error);
    res.status(500).json({ success: false, message: error.message || "DB error" });
  }
};

// DELETE /api/regular-events/:id
export const handleDeleteRegularEvent: RequestHandler = async (req: any, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("id", sql.Int, req.params.id)
      .query(`DELETE FROM regular_event WHERE id=@id`);

    if (!result.rowsAffected[0]) {
      return res.status(404).json({ success: false, message: "Regular Event not found" });
    }

    await writeLog(
      pool,
      req.user?.id || null,
      "DELETE_REGULAR_EVENT",
      "regular_event",
      parseInt(req.params.id),
      `Deleted regular event ${req.params.id}`,
      req.ip
    );

    res.json({ success: true, message: "Regular Event deleted" });
  } catch (error: any) {
    console.error("[DELETE REGULAR EVENT]", error);
    res.status(500).json({ success: false, message: error.message || "DB error" });
  }
};
