import { RequestHandler } from "express";
import { getConnection, sql } from "../db/config";

const getStartDateForPeriod = (period: string) => {
  const now = new Date();

  if (period === "week") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  }

  return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
};

export const handleGetLeaderboard: RequestHandler = async (req, res) => {
  const period = req.query.period === "week" ? "week" : "month";
  const eventIdRaw = req.query.eventId;
  const parsedEventId = typeof eventIdRaw === "string" ? Number.parseInt(eventIdRaw, 10) : Number.NaN;
  const eventId = Number.isFinite(parsedEventId) ? parsedEventId : null;

  try {
    const pool = await getConnection();
    const startDate = getStartDateForPeriod(period);
    const columnCheck = await pool
      .request()
      .query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'users' AND COLUMN_NAME IN ('points', 'total_points', 'member_id', 'user_id')
      `);

    const columnNames = new Set<string>(
      columnCheck.recordset.map((row) => String(row.COLUMN_NAME).toLowerCase()),
    );
    const memberColumn = columnNames.has("member_id") ? "u.member_id" : columnNames.has("user_id") ? "u.user_id" : "CAST(u.id AS NVARCHAR(50))";
    const pointsColumn = columnNames.has("points") ? "u.points" : columnNames.has("total_points") ? "u.total_points" : null;
    const pointsSelect = pointsColumn ? `COALESCE(${pointsColumn}, 0)` : "0";
    const pointsGroupBy = pointsColumn ? `, ${pointsColumn}` : "";

    const query = `
      SELECT
        u.id AS user_id,
        u.full_name,
        ${memberColumn} AS member_id,
        COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) AS total_present,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) AS total_late,
        CAST(
          ROUND(
            CASE
              WHEN COUNT(a.id) = 0 THEN 0
              ELSE CAST(COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) AS FLOAT) / COUNT(a.id) * 100
            END,
            2
          ) AS DECIMAL(5, 2)
        ) AS attendance_percentage,
        ${pointsSelect} AS points
      FROM users u
      LEFT JOIN attendance a ON a.user_id = u.id
        AND a.attendance_date >= @startDate
        AND (@eventId IS NULL OR a.event_id = @eventId)
      WHERE u.role = 'member' AND u.is_active = 1
      GROUP BY u.id, u.full_name, ${memberColumn}${pointsGroupBy}
      ORDER BY points DESC, total_present DESC, attendance_percentage DESC, u.full_name ASC
    `;

    const result = await pool
      .request()
      .input("startDate", sql.Date, startDate)
      .input("eventId", eventId === null ? sql.Int : sql.Int, eventId)
      .query(query);

    res.json({
      success: true,
      data: result.recordset,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch leaderboard",
    });
  }
};
