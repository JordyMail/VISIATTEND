import { RequestHandler } from "express";
import { getConnection, sql } from "../db/config";

const TREND_DAY_LABELS = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Today"];

const buildTrend = (totalPoints: number, dailyPoints = new Map<string, number>()) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDay = new Date(today);
  firstDay.setDate(firstDay.getDate() - 6);
  let runningPoints = Math.max(totalPoints, 0) - [...dailyPoints.values()].reduce((sum, value) => sum + value, 0);

  return TREND_DAY_LABELS.map((label, index) => {
    const day = new Date(firstDay);
    day.setDate(firstDay.getDate() + index);
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    runningPoints += dailyPoints.get(key) ?? 0;
    return { label, points: Math.max(runningPoints, 0) };
  });
};

const getEmptyTrend = () => TREND_DAY_LABELS.map((label) => ({ label, points: 0 }));

const normalizeString = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

async function findMatchedUser(email: string | null, name: string | null) {
  if (!email && !name) {
    return null;
  }

  const pool = await getConnection();

  const result = await pool
    .request()
    .input("email", sql.NVarChar, email)
    .input("name", sql.NVarChar, name)
    .query(`
      SELECT TOP 1
        um.id,
        um.member_id,
        um.name AS full_name,
        email,
        COALESCE(log_totals.points, mp.points, 0) AS points
      FROM user_member um
      LEFT JOIN member_point mp ON mp.member_id = um.member_id
      LEFT JOIN (
        SELECT member_id, SUM(COALESCE(points, 0)) AS points
        FROM point_logs
        GROUP BY member_id
      ) log_totals ON log_totals.member_id = um.member_id
      WHERE 1=1
        AND (
          (@email IS NOT NULL AND LOWER(email) = LOWER(@email))
          OR (@name IS NOT NULL AND LOWER(um.name) = LOWER(@name))
        )
      ORDER BY CASE WHEN @email IS NOT NULL AND LOWER(email) = LOWER(@email) THEN 0 ELSE 1 END, id ASC
    `);

  if (result.recordset[0]) return result.recordset[0];

  const userResult = await pool
    .request()
    .input("userEmail", sql.NVarChar, email)
    .input("userName", sql.NVarChar, name)
    .query(`
      SELECT TOP 1
        u.id,
        u.member_id,
        u.full_name,
        u.email,
        COALESCE(log_totals.points, mp.points, 0) AS points
      FROM users u
      LEFT JOIN member_point mp ON mp.member_id = u.member_id
      LEFT JOIN (
        SELECT member_id, SUM(COALESCE(points, 0)) AS points
        FROM point_logs
        GROUP BY member_id
      ) log_totals ON log_totals.member_id = u.member_id
      WHERE (@userEmail IS NOT NULL AND LOWER(u.email) = LOWER(@userEmail))
         OR (@userName IS NOT NULL AND LOWER(u.full_name) = LOWER(@userName))
      ORDER BY CASE WHEN @userEmail IS NOT NULL AND LOWER(u.email) = LOWER(@userEmail) THEN 0 ELSE 1 END, u.id ASC
    `);

  return userResult.recordset[0] ?? null;
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
          trend: getEmptyTrend(),
        },
      });
      return;
    }

    const points = Number(matchedUser.points ?? 0);

    // Fetch today's attendance record
    const pool = await getConnection();
    const rankResult = await pool.request()
      .input("member_id", sql.NVarChar, matchedUser.member_id)
      .query(`
        SELECT 1 + COUNT(*) AS rank
        FROM member_point other
        WHERE other.points > COALESCE((
          SELECT points FROM member_point WHERE member_id=@member_id
        ), 0)
      `);
    let dailyPoints = new Map<string, number>();
    try {
      const trendResult = await pool.request()
        .input("member_id", sql.NVarChar, matchedUser.member_id)
        .query(`
          SELECT CONVERT(char(10), created_at, 23) AS point_date,
                 SUM(COALESCE(points, 0)) AS points
          FROM point_logs
          WHERE member_id=@member_id
            AND created_at >= DATEADD(day, -6, CAST(GETDATE() AS DATE))
          GROUP BY CONVERT(char(10), created_at, 23)
        `);
      dailyPoints = new Map<string, number>(
        trendResult.recordset.map((row: any) => [row.point_date, Number(row.points ?? 0)])
      );
    } catch (trendError) {
      console.warn("[USER DASHBOARD TREND] Falling back to total points:", trendError);
    }
    const attendanceResult = await pool
      .request()
      .input("member_id", sql.NVarChar, matchedUser.member_id)
      .query(`
        SELECT TOP 1 attendance_date
        FROM attendance_member
        WHERE member_id = @member_id
          AND CAST(attendance_date AS DATE) = CAST(GETDATE() AS DATE)
        ORDER BY attendance_date DESC
      `);
    const attendanceDate = attendanceResult.recordset[0]?.attendance_date || null;

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
        rank: Number(rankResult.recordset[0]?.rank ?? 1),
        attendanceDate,
        trend: buildTrend(points, dailyPoints),
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
  const notes = normalizeString(req.body.notes);

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

    if (!matchedUser.member_id) {
      res.status(400).json({ success: false, message: "Member ID is not available for this user" });
      return;
    }

    await pool
      .request()
      .input("member_id", sql.NVarChar, matchedUser.member_id)
      .input("reward", sql.Int, reward)
      .input("notes", sql.NVarChar, notes || "question reward")
      .input("type", sql.NVarChar, "quiz")
      .query(`
        INSERT INTO point_logs (member_id, points, type, notes, created_at)
        VALUES (@member_id, @reward, @type, @notes, GETDATE())
      `);

    const summaryResult = await pool
      .request()
      .input("member_id", sql.NVarChar, matchedUser.member_id)
      .query(`
        SELECT COALESCE(points, 0) AS points
        FROM member_point
        WHERE member_id = @member_id
      `);

    const points = Number(summaryResult.recordset[0]?.points ?? 0);

    res.json({
      success: true,
      data: {
        matched: true,
        memberId: matchedUser.member_id,
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

import * as fs from "fs";
import * as path from "path";

const logToFile = (msg: string) => {
  try {
    const logPath = "e:\\CAPSTONE\\BEpy\\VISIATTEND\\server\\debug.log";
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (e) {
    // ignore
  }
};

export const handleGetUserDashboardQuestions: RequestHandler = async (req, res) => {
  const email = normalizeString(req.query.email);
  const name = normalizeString(req.query.name);

  logToFile(`🔍 [GET QUESTIONS] Incoming: name=${name}, email=${email}`);

  try {
    const matchedUser = await findMatchedUser(email, name);
    logToFile(`🔍 [GET QUESTIONS] Matched User Member: ${JSON.stringify(matchedUser)}`);
    if (!matchedUser) {
      logToFile(`🔍 [GET QUESTIONS] No matched user member. Returning empty.`);
      res.json({ success: true, data: [] });
      return;
    }

    const pool = await getConnection();

    // 1. Get today's attendance record
    const attendanceResult = await pool
      .request()
      .input("member_id", sql.NVarChar, matchedUser.member_id)
      .query(`
        SELECT TOP 1 attendance_date
        FROM attendance_member
        WHERE member_id = @member_id
          AND CAST(attendance_date AS DATE) = CAST(GETDATE() AS DATE)
        ORDER BY attendance_date DESC
      `);

    const attendanceDate = attendanceResult.recordset[0]?.attendance_date;
    logToFile(`🔍 [GET QUESTIONS] Attendance Date: ${attendanceDate}`);
    if (!attendanceDate) {
      logToFile(`🔍 [GET QUESTIONS] No attendance record found for today. Returning empty.`);
      res.json({ success: true, data: [] });
      return;
    }

    // 2. Resolve users.id
    // 3. Get active questions for that attendance date
    const questionsResult = await pool
      .request()
      .input("memberId", sql.NVarChar, matchedUser.member_id)
      .input("attendanceDate", sql.DateTime, attendanceDate)
      .query(`
        SELECT q.id, q.question_text, q.question_type, q.correct_answer, q.points,
          (SELECT COUNT(*) FROM user_answers ua 
           WHERE ua.question_id = q.id AND ua.member_id = @memberId) as answered
        FROM questions q
        WHERE q.is_active = 1
          AND q.event_id IS NOT NULL
        ORDER BY q.created_at ASC
      `);

    logToFile(`🔍 [GET QUESTIONS] Found questions: ${JSON.stringify(questionsResult.recordset)}`);

    res.json({
      success: true,
      data: questionsResult.recordset,
    });
  } catch (error) {
    logToFile(`❌ [GET QUESTIONS] Error: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch user dashboard questions",
    });
  }
};

export const handleAnswerUserDashboardQuestion: RequestHandler = async (req, res) => {
  const email = normalizeString(req.body.email);
  const name = normalizeString(req.body.name);
  const questionId = Number(req.body.questionId);
  const answerText = normalizeString(req.body.answer);
  const timeSpentSeconds = Number(req.body.timeSpentSeconds || 0);

  if (!questionId || !answerText) {
    res.status(400).json({ success: false, message: "Question ID and answer are required" });
    return;
  }

  try {
    const matchedUser = await findMatchedUser(email, name);
    if (!matchedUser) {
      res.status(404).json({ success: false, message: "User profile not found" });
      return;
    }

    const pool = await getConnection();

    // 1. Get question details
    const questionResult = await pool
      .request()
      .input("id", sql.Int, questionId)
      .query("SELECT * FROM questions WHERE id = @id");
    const question = questionResult.recordset[0];
    if (!question) {
      res.status(404).json({ success: false, message: "Question not found" });
      return;
    }

    // 2. Check if already answered
    const answeredResult = await pool
      .request()
      .input("memberId", sql.NVarChar, matchedUser.member_id)
      .input("questionId", sql.Int, questionId)
      .query("SELECT COUNT(*) as cnt FROM user_answers WHERE member_id = @memberId AND question_id = @questionId");
    if (answeredResult.recordset[0].cnt > 0) {
      res.status(400).json({ success: false, message: "Anda sudah menjawab pertanyaan ini." });
      return;
    }

    // 3. Compare answer
    let isCorrect = false;
    const userAnswerStr = answerText.trim();
    const correctAnswerStr = String(question.correct_answer).trim();

    if (question.question_type === 'multiple_choice') {
      isCorrect = userAnswerStr.toUpperCase() === correctAnswerStr.toUpperCase();
    } else if (question.question_type === 'true_false') {
      isCorrect = userAnswerStr.toLowerCase() === correctAnswerStr.toLowerCase();
    } else if (question.question_type === 'short_answer') {
      isCorrect = userAnswerStr.toLowerCase().includes(correctAnswerStr.toLowerCase());
    }

    const pointsEarned = isCorrect ? 10 : null;

    // 4. Insert into user_answers
    await pool
      .request()
      .input("memberId", sql.NVarChar, matchedUser.member_id)
      .input("questionId", sql.Int, questionId)
      .input("answerText", sql.NVarChar, userAnswerStr)
      .input("isCorrect", sql.Bit, isCorrect ? 1 : 0)
      .input("pointsEarned", sql.Int, pointsEarned)
      .query(`
        INSERT INTO user_answers (member_id, question_id, answer_text, is_correct, points_earned, answered_at)
        VALUES (@memberId, @questionId, @answerText, @isCorrect, @pointsEarned, GETDATE());
      `);

    // 5. If correct, insert into point_logs
    if (isCorrect && matchedUser.member_id) {
      await pool
        .request()
        .input("member_id", sql.NVarChar, matchedUser.member_id)
        .input("points", sql.Int, 10)
        .input("type", sql.NVarChar, "question")
        .input("notes", sql.NVarChar, `Bible Study Quiz reward for question: ${question.question_text?.slice(0, 80)}`)
        .query(`
          INSERT INTO point_logs (member_id, points, type, notes, created_at)
          VALUES (@member_id, @points, @type, @notes, GETDATE())
        `);
    }

    // 7. Get updated total points
    const totalPointsResult = await pool
      .request()
      .input("member_id", sql.NVarChar, matchedUser.member_id)
      .query(`
        SELECT COALESCE(points, 0) AS points
        FROM member_point
        WHERE member_id = @member_id
      `);
    const nextPoints = Number(totalPointsResult.recordset[0]?.points ?? matchedUser.points);

    res.json({
      success: true,
      data: {
        isCorrect,
        pointsEarned,
        message: isCorrect 
          ? `Benar! Anda mendapatkan ${pointsEarned} poin.` 
          : `Jawaban salah.`,
        updatedPoints: nextPoints,
        trend: buildTrend(nextPoints),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to submit answer",
    });
  }
};
