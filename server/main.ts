// server/main.ts
import "dotenv/config";
import path from "path";
import express from "express";
import { createServer } from "./index";

const app = createServer();
const port = process.env.PORT || 3000;

// Production SPA serving
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(process.cwd(), "dist/spa");
  app.use(express.static(distPath));
  
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$/)) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
});