import fs from "fs/promises";
import path from "path";

const FACE_AI_STORAGE_DIR = path.resolve(process.cwd(), "server", "storage", "face-ai");
const FACE_AI_USERS_PATH = path.join(FACE_AI_STORAGE_DIR, "users.json");
const FACE_AI_ATTENDANCE_LOGS_PATH = path.join(FACE_AI_STORAGE_DIR, "attendance.json");

export interface FaceAiUserProfile {
  userId: string;
  name: string;
  email: string;
  category: string;
  phone: string;
  birthday: string;
  createdAt: string;
  updatedAt: string;
  registrationSessionId?: string;
}

interface FaceAiAttendanceRecord {
  userId: string;
  name: string;
  confidence: number;
  capturedAt: string;
}

async function ensureStorage() {
  await fs.mkdir(FACE_AI_STORAGE_DIR, { recursive: true });
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, payload: unknown) {
  await ensureStorage();
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");
}

export async function upsertFaceAiUser(profile: FaceAiUserProfile) {
  const users = await readJsonFile<FaceAiUserProfile[]>(FACE_AI_USERS_PATH, []);
  const existingIndex = users.findIndex((entry) => entry.userId === profile.userId);

  if (existingIndex >= 0) {
    users[existingIndex] = profile;
  } else {
    users.push(profile);
  }

  await writeJsonFile(FACE_AI_USERS_PATH, users);
  return profile;
}

export async function getFaceAiUser(userId: string) {
  const users = await readJsonFile<FaceAiUserProfile[]>(FACE_AI_USERS_PATH, []);
  return users.find((entry) => entry.userId === userId) ?? null;
}

export async function recordFaceAiAttendance(record: FaceAiAttendanceRecord) {
  const logs = await readJsonFile<FaceAiAttendanceRecord[]>(FACE_AI_ATTENDANCE_LOGS_PATH, []);
  logs.push(record);
  await writeJsonFile(FACE_AI_ATTENDANCE_LOGS_PATH, logs);
  return record;
}
