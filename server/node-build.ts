// 
import path from "path";
import express from "express";
import { createServer } from "./index";

const app = createServer();
const port = process.env.PORT || 3000;

// In production, serve the built SPA files
if (process.env.NODE_ENV === "production") {
  const __dirname = import.meta.dirname;
  const distPath = path.join(__dirname, "../spa");

  // Serve static files
  app.use(express.static(distPath));

  // Handle SPA routing - JANGAN gunakan pattern /* atau *
  app.use((req, res, next) => {
    // Skip API routes
    if (req.path.startsWith("/api/")) {
      return next();
    }
    
    // Skip static files with extensions
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$/)) {
      return next();
    }
    
    // Serve index.html for SPA routes
    res.sendFile(path.join(distPath, "index.html"), (err) => {
      if (err) {
        console.error("Error serving index.html:", err);
        next(err);
      }
    });
  });
}

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📱 Mode: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
});