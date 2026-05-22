import { RequestHandler } from "express";
import { getConnection, sql } from "../db/config";

type UserColumns = {
  nameColumn: string;
  pointsColumn: string | null;
};

const TREND_DAY_LABELS = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Today"];

const buildTrend = (totalPoints: number) => {
  const safeTotal = Math.max(totalPoints, 0);
  const offsets = [11, 9, 8, 6, 5, 3, 0];

  return TREND_DAY_LABELS.map((label, index) => ({
    label,
    points: Math.max(safeTotal - offsets[index], 0),
  }));
};

const normalizeString = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

async function getUserColumns(): Promise<UserColumns> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'users' AND COLUMN_NAME IN ('full_name', 'name', 'points', 'total_points')
    `);

  const columns = new Set<string>(result.recordset.map((row) => String(row.COLUMN_NAME).toLowerCase()));

  return {
    nameColumn: columns.has("full_name") ? "full_name" : "name",
    pointsColumn: columns.has("points") ? "points" : columns.has("total_points") ? "total_points" : null,
  };
}

async function findMatchedUser(email: string | null, name: string | null) {
  if (!email && !name) {
    return null;
  }

  const pool = await getConnection();
  const { nameColumn, pointsColumn } = await getUserColumns();
  const pointsSelect = pointsColumn ? `COALESCE(${pointsColumn}, 0)` : "0";

  const result = await pool
    .request()
    .input("email", sql.NVarChar, email)
    .input("name", sql.NVarChar, name)
    .query(`
      SELECT TOP 1
        id,
        ${nameColumn} AS full_name,
        email,
        ${pointsSelect} AS points
      FROM users
      WHERE is_active = 1
        AND (
          (@email IS NOT NULL AND LOWER(email) = LOWER(@email))
          OR (@name IS NOT NULL AND LOWER(${nameColumn}) = LOWER(@name))
        )
      ORDER BY CASE WHEN @email IS NOT NULL AND LOWER(email) = LOWER(@email) THEN 0 ELSE 1 END, id ASC
    `);

  return result.recordset[0] ?? null;
}

export const handleGetUserDashboard: RequestHandler = async (req, res) => {
  const email = normalizeString(req.query.email);
  const name = normalizeString(req.query.name);

  try {
    const matchedUser = await findMatchedUser(email, name);

    if (!matchedUser) {
      res.json({
        success: true,
        data: {
          matched: false,
          profile: null,
          points: 0,
          trend: buildTrend(0),
        },
      });
      return;
    }

    const points = Number(matchedUser.points ?? 0);
    res.json({
      success: true,
      data: {
        matched: true,
        profile: {
          id: matchedUser.id,
          fullName: matchedUser.full_name,
          email: matchedUser.email,
        },
        points,
        trend: buildTrend(points),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch user dashboard",
    });
  }
};

export const handleAwardQuestionPoints: RequestHandler = async (req, res) => {
  const email = normalizeString(req.body.email);
  const name = normalizeString(req.body.name);
  const reward = Number(req.body.reward ?? 5);

  if (!Number.isFinite(reward) || reward <= 0) {
    res.status(400).json({ success: false, message: "Reward points must be a positive number" });
    return;
  }

  try {
    const matchedUser = await findMatchedUser(email, name);

    if (!matchedUser) {
      res.status(404).json({ success: false, message: "User dashboard profile not found" });
      return;
    }

    const pool = await getConnection();
    const { pointsColumn } = await getUserColumns();

    if (!pointsColumn) {
      res.status(400).json({ success: false, message: "Points column is not available in users table" });
      return;
    }

    const updateResult = await pool
      .request()
      .input("id", sql.Int, matchedUser.id)
      .input("reward", sql.Int, reward)
      .query(`
        UPDATE users
        SET ${pointsColumn} = COALESCE(${pointsColumn}, 0) + @reward,
            updated_at = GETDATE()
        OUTPUT INSERTED.id, INSERTED.${pointsColumn} AS points
        WHERE id = @id
      `);

    const updatedUser = updateResult.recordset[0];
    const points = Number(updatedUser?.points ?? matchedUser.points ?? 0);

    res.json({
      success: true,
      data: {
        matched: true,
        points,
        rewardedPoints: reward,
        trend: buildTrend(points),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to award question points",
    });
  }
};
