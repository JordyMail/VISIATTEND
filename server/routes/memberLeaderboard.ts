// server/routes/memberLeaderboard.ts
import { RequestHandler } from "express";
import { getConnection } from "../db/config.js";

/**
 * GET /api/member-leaderboard
 * Returns leaderboard from member_point joined with the available user profile.
 * No auth required — public endpoint.
 */
export const handleGetMemberLeaderboard: RequestHandler = async (_req, res) => {
  try {
    const pool = await getConnection();

    const result = await pool.request().query(`
      SELECT
        mp.member_id,
        COALESCE(um.name, u.full_name)   AS full_name,
        COALESCE(um.email, u.email)      AS email,
        um.category,
        mp.points,
        mp.updated_at,
        ROW_NUMBER() OVER (
          ORDER BY mp.points DESC,
                   COALESCE(um.name, u.full_name) ASC
        ) AS rank
      FROM member_point mp
      LEFT JOIN user_member um ON um.member_id = mp.member_id
      LEFT JOIN users       u  ON u.member_id  = mp.member_id
      WHERE mp.points > 0
        AND COALESCE(um.name, u.full_name) IS NOT NULL
      ORDER BY mp.points DESC, COALESCE(um.name, u.full_name) ASC
    `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch leaderboard",
    });
  }
};
