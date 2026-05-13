import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import attendanceRoutes from "./routes/attendance";
import authRoutes from "./routes/auth";
import dashboardRoutes from "./routes/dashboard";
import flutterAttendanceRoutes from "./routes/flutter/attendance";
import pointRoutes from "./routes/points";
import userRoutes from "./routes/users";

export function createServer() {
  const app = express();
  const requestBodyLimit = "15mb";

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: requestBodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: requestBodyLimit }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/attendance", attendanceRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/points", pointRoutes);
  app.use("/api/flutter/attendance", flutterAttendanceRoutes);

  app.get("/health", (_req, res) => {
    res.json({ success: true, message: "ok" });
  });

  return app;
}
