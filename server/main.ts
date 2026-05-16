// server/main.ts
import "dotenv/config";
import path from "path";
import express from "express";
import { createServer } from "./index.js";

const app = createServer();
const port = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  const distPath = path.join(process.cwd(), "dist/spa");

  // Serve static assets
  app.use(express.static(distPath));

  // SPA fallback - HARUS di paling bawah
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$/)) {
      return next();
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`🚀 VISIATTEND running on http://localhost:${port}`);
  console.log(`📍 Mode: ${process.env.NODE_ENV || "development"}`);
});