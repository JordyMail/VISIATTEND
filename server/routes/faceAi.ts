import { RequestHandler } from "express";
import { getFaceAiUser, recordFaceAiAttendance, upsertFaceAiUser } from "../faceAiStore";
import { runFaceAiCommand } from "../faceAiBridge";
import { getConnection, sql } from "../db/config";

interface RegistrationPayload {
  name: string;
  email: string;
  category: string;
  phone: string;
  birthday: string;
}

const sanitizeUserId = (name: string) => {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

  return `${base || "USER"}-${Date.now().toString().slice(-6)}`;
};

const validateProfile = (profile: Partial<RegistrationPayload>) => {
  return Boolean(
    profile.name?.trim() &&
      profile.email?.trim() &&
      profile.category?.trim() &&
      profile.phone?.trim() &&
      profile.birthday?.trim(),
  );
};

export const handleCaptureRegistration: RequestHandler = async (req, res) => {
  try {
    const payload = await runFaceAiCommand<{
      sessionId: string;
      sampleCount: number;
      remainingCaptures: number;
      readyForProfile: boolean;
      duplicateCapture?: boolean;
      faceDetection?: unknown;
      embeddingDimension?: number;
    }>("capture-registration", {
      imageBase64: req.body.imageBase64,
      sessionId: req.body.sessionId,
    });

    res.json({ success: true, data: payload });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to capture registration sample",
    });
  }
};

export const handlePreviewDetection: RequestHandler = async (req, res) => {
  try {
    const payload = await runFaceAiCommand<{
      detected: boolean;
      faceDetection?: unknown;
    }>("preview-detection", {
      imageBase64: req.body.imageBase64,
    });

    res.json({ success: true, data: payload });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to preview face detection",
    });
  }
};

export const handleFinalizeRegistration: RequestHandler = async (req, res) => {
  const profile = (req.body.profile ?? {}) as Partial<RegistrationPayload>;

  if (!req.body.sessionId || !validateProfile(profile)) {
    res.status(400).json({ success: false, message: "Registration session and full profile are required" });
    return;
  }

  const userId = sanitizeUserId(profile.name || "USER");

  try {
    const finalizeResult = await runFaceAiCommand<{
      userId: string;
      name: string;
      registeredSamples: number;
      sessionId: string;
      storagePath: string;
    }>("finalize-registration", {
      sessionId: req.body.sessionId,
      userId,
      name: profile.name,
    });

    const now = new Date().toISOString();
    const savedProfile = await upsertFaceAiUser({
      userId: finalizeResult.userId,
      name: profile.name!,
      email: profile.email!,
      category: profile.category!,
      phone: profile.phone!,
      birthday: profile.birthday!,
      createdAt: now,
      updatedAt: now,
      registrationSessionId: finalizeResult.sessionId,
    });

    res.json({
      success: true,
      data: {
        ...finalizeResult,
        profile: savedProfile,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to finalize face registration",
    });
  }
};

export const handleVerifyAttendance: RequestHandler = async (req, res) => {
  try {
    const activeLiveness = req.body.activeLiveness;
    const activePassed = Boolean(activeLiveness?.passed);
    if (!activePassed) {
      res.status(403).json({
        success: false,
        message: "Active liveness challenge belum berhasil. Selesaikan challenge (blink / turn head / smile) sebelum attendance.",
        data: {
          code: "ACTIVE_LIVENESS_REQUIRED",
          activeLiveness: activeLiveness ?? null,
        },
      });
      return;
    }

    const verifyResult = await runFaceAiCommand<{
      matched: boolean;
      matchedUserId?: string;
      matchedName?: string;
      confidence: number;
      code: string;
      threshold: number;
      faceDetection?: unknown;
      liveness?: { score: number; method: string; dryRun: boolean };
    }>("verify", {
      imageBase64: req.body.imageBase64,
      threshold: req.body.threshold ?? 0.45,
      activeLiveness,
    });

    if (!verifyResult.matched || !verifyResult.matchedUserId) {
      res.status(404).json({
        success: false,
        message: verifyResult.code === "FACE_NOT_MATCH"
          ? "Wajah belum terdaftar atau tidak cocok. Registrasi wajah wajib dilakukan lebih dulu."
          : "Wajah belum terdaftar.",
        data: verifyResult,
      });
      return;
    }

    const profile = await getFaceAiUser(verifyResult.matchedUserId);
    const resolvedName = profile?.name ?? verifyResult.matchedName ?? verifyResult.matchedUserId;

    if (!profile?.email && !resolvedName) {
      res.status(400).json({
        success: false,
        message: "Profil user untuk face attendance belum lengkap.",
      });
      return;
    }

    const pool = await getConnection();
    const memberResult = await pool
      .request()
      .input("email", sql.NVarChar, profile?.email ?? null)
      .input("name", sql.NVarChar, resolvedName)
      .query(`
        SELECT TOP 1 id, member_id, name, email
        FROM user_member
        WHERE
          (@email IS NOT NULL AND LOWER(email) = LOWER(@email))
          OR LOWER(name) = LOWER(@name)
        ORDER BY CASE WHEN @email IS NOT NULL AND LOWER(email) = LOWER(@email) THEN 0 ELSE 1 END, id ASC
      `);

    const member = memberResult.recordset[0];
    if (!member?.member_id) {
      res.status(404).json({
        success: false,
        message: "Data member tidak ditemukan. Silakan registrasi data member terlebih dahulu.",
      });
      return;
    }

    const duplicateResult = await pool
      .request()
      .input("member_id", sql.NVarChar, member.member_id)
      .query(`
        SELECT TOP 1 id, attendance_date
        FROM attendance_member
        WHERE member_id = @member_id
          AND CAST(attendance_date AS DATE) = CAST(GETDATE() AS DATE)
      `);

    if (duplicateResult.recordset.length > 0) {
      res.status(409).json({
        success: false,
        message: "Sudah melakukan attendance hari ini",
        data: {
          memberId: member.member_id,
          name: member.name,
          alreadyAttendanceAt: duplicateResult.recordset[0].attendance_date,
        },
      });
      return;
    }

    const insertAttendanceResult = await pool
      .request()
      .input("user_id", sql.NVarChar, verifyResult.matchedUserId)
      .input("member_id", sql.NVarChar, member.member_id)
      .input("name", sql.NVarChar, member.name)
      .input("points", sql.Int, 10)
      .query(`
        DECLARE @InsertedAttendance TABLE (
          id INT,
          user_id NVARCHAR(100),
          member_id NVARCHAR(20),
          name NVARCHAR(150),
          attendance_date DATETIME,
          points INT,
          created_at DATETIME
        );

        DECLARE @TodayEventCode NVARCHAR(20);
        SELECT TOP 1 @TodayEventCode = event_code FROM event_schedule WHERE date_event = CAST(GETDATE() AS DATE);

        INSERT INTO attendance_member (user_id, member_id, name, attendance_date, points, event_code)
        OUTPUT 
          INSERTED.id, 
          INSERTED.user_id, 
          INSERTED.member_id, 
          INSERTED.name, 
          INSERTED.attendance_date, 
          INSERTED.points, 
          INSERTED.created_at
        INTO @InsertedAttendance
        VALUES (@user_id, @member_id, @name, GETDATE(), @points, @TodayEventCode);

        SELECT * FROM @InsertedAttendance;
      `);

    await pool
      .request()
      .input("member_id", sql.NVarChar, member.member_id)
      .input("points", sql.Int, 10)
      .input("type", sql.NVarChar, "attendance")
      .query(`
        INSERT INTO point_logs (member_id, points, type, notes, created_at)
        VALUES (@member_id, @points, @type, 'face attendance reward', GETDATE())
      `);

    const totalPointsResult = await pool
      .request()
      .input("member_id", sql.NVarChar, member.member_id)
      .query(`
        SELECT COALESCE(points, 0) AS points
        FROM member_point
        WHERE member_id = @member_id
      `);

    const attendanceRecord = await recordFaceAiAttendance({
      userId: verifyResult.matchedUserId,
      name: resolvedName,
      confidence: verifyResult.confidence,
      capturedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      data: {
        ...verifyResult,
        profile,
        member: {
          id: member.id,
          memberId: member.member_id,
          name: member.name,
          email: member.email,
        },
        attendanceMember: insertAttendanceResult.recordset[0],
        rewardedPoints: 10,
        totalPoints: Number(totalPointsResult.recordset[0]?.points ?? 0),
        attendanceRecord,
      },
    });
  } catch (error) {
    const sqlMessage = error instanceof Error ? error.message : "";
    if (sqlMessage.includes("UX_attendance_member_member_day")) {
      res.status(409).json({
        success: false,
        message: "Sudah melakukan attendance hari ini",
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to verify attendance face",
    });
  }
};
