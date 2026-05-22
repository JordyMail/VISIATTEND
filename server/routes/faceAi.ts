import { RequestHandler } from "express";
import { getFaceAiUser, recordFaceAiAttendance, upsertFaceAiUser } from "../faceAiStore";
import { runFaceAiCommand } from "../faceAiBridge";

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
    const verifyResult = await runFaceAiCommand<{
      matched: boolean;
      matchedUserId?: string;
      matchedName?: string;
      confidence: number;
      code: string;
      threshold: number;
      faceDetection?: unknown;
    }>("verify", {
      imageBase64: req.body.imageBase64,
      threshold: req.body.threshold ?? 0.45,
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
    const attendanceRecord = await recordFaceAiAttendance({
      userId: verifyResult.matchedUserId,
      name: profile?.name ?? verifyResult.matchedName ?? verifyResult.matchedUserId,
      confidence: verifyResult.confidence,
      capturedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      data: {
        ...verifyResult,
        profile,
        attendanceRecord,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to verify attendance face",
    });
  }
};
