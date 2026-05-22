import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleGetLeaderboard } from "./routes/attendance";
import { handleAwardQuestionPoints, handleGetUserDashboard } from "./routes/userDashboard";
import {
  handlePreviewDetection,
  handleCaptureRegistration,
  handleFinalizeRegistration,
  handleVerifyAttendance,
} from "./routes/faceAi";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "8mb" }));
  app.use(express.urlencoded({ extended: true, limit: "8mb" }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.get("/api/attendance/leaderboard", handleGetLeaderboard);
  app.get("/api/user-dashboard/profile", handleGetUserDashboard);
  app.post("/api/user-dashboard/question/reward", handleAwardQuestionPoints);
  app.post("/api/face-ai/preview", handlePreviewDetection);
  app.post("/api/face-ai/registration/capture", handleCaptureRegistration);
  app.post("/api/face-ai/registration/finalize", handleFinalizeRegistration);
  app.post("/api/face-ai/attendance/verify", handleVerifyAttendance);

  return app;
}
