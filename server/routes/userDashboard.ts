import { RequestHandler } from "express";
import { getConnection, sql } from "../db/config";

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
        COALESCE(mp.points, 0) AS points
      FROM user_member um
      LEFT JOIN member_point mp ON mp.member_id = um.member_id
      WHERE 1=1
        AND (
          (@email IS NOT NULL AND LOWER(email) = LOWER(@email))
          OR (@name IS NOT NULL AND LOWER(um.name) = LOWER(@name))
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

    // Fetch today's attendance record
    const pool = await getConnection();
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
        attendanceDate,
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
        SELECT q.id, q.title, q.question_text, q.question_type, q.options, q.points, q.time_limit_minutes, q.correct_answer,
          (SELECT COUNT(*) FROM user_answers ua 
           WHERE ua.question_id = q.id AND ua.member_id = @memberId) as answered
        FROM questions q
        WHERE q.is_active = 1
          AND CAST(q.start_date AS DATE) = CAST(@attendanceDate AS DATE)
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
      .input("timeSpentSeconds", sql.Int, timeSpentSeconds || null)
      .query(`
        INSERT INTO user_answers (member_id, question_id, answer_text, is_correct, points_earned, time_spent_seconds, attempt_number, answered_at)
        VALUES (@memberId, @questionId, @answerText, @isCorrect, @pointsEarned, @timeSpentSeconds, 1, GETDATE());
      `);

    // 5. If correct, insert into point_logs
    if (isCorrect && matchedUser.member_id) {
      await pool
        .request()
        .input("member_id", sql.NVarChar, matchedUser.member_id)
        .input("points", sql.Int, 10)
        .input("type", sql.NVarChar, "question")
        .input("notes", sql.NVarChar, `Bible Study Quiz reward for question: ${question.title}`)
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
