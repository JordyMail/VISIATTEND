// vite.config.ts
import "dotenv/config";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],

  root: ".",
  base: "/",

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },

  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        // Use PORT from environment (matches server/.env) or fall back to 3001
        // Force IPv4 loopback to avoid IPv6 resolution issues on some systems
        target: `http://127.0.0.1:${process.env.PORT || 3001}`,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, "/api"),
      },
    },
  },

  build: {
    outDir: "dist/spa",
    emptyOutDir: true,
    rollupOptions: {
      input: "./index.html",
    },
  },
});