// server/routes/memberLeaderboard.ts
import { RequestHandler } from "express";
import { getConnection } from "../db/config.js";

/**
 * GET /api/member-leaderboard
 * Returns leaderboard from member_point joined with user_member.
 * No auth required — public endpoint.
 */
export const handleGetMemberLeaderboard: RequestHandler = async (_req, res) => {
  try {
    const pool = await getConnection();

    const result = await pool.request().query(`
      SELECT
        mp.member_id,
        um.name        AS full_name,
        um.category,
        mp.points,
        mp.updated_at,
        ROW_NUMBER() OVER (ORDER BY mp.points DESC, um.name ASC) AS rank
      FROM member_point mp
      INNER JOIN user_member um ON um.member_id = mp.member_id
      ORDER BY mp.points DESC, um.name ASC
    `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch leaderboard",
    });
  }
};
