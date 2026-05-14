// server/server.ts
import "dotenv/config";
import path from "path";
import express from "express";
import { createServer } from "./index.js";

const app = createServer();
const port = process.env.PORT || 3000;

// In production, serve the built SPA files
if (process.env.NODE_ENV === "production") {
  const __dirname = import.meta.dirname;
  const distPath = path.join(__dirname, "../dist/spa");

  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$/)) return next();
    res.sendFile(path.join(distPath, "index.html"), (err) => err && next(err));
  });
}

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📱 Mode: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
  console.log(`🔑 Health: http://localhost:${port}/api/ping`);
});