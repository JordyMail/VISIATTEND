import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,  // ← Ganti ke 8081
    proxy: {
      '/api': {
        target: 'http://localhost:8080',  // ← Backend URL
        changeOrigin: true,
        secure: false,
      }
    },
    fs: {
      allow: ["./", "./client", "./shared"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react()],  // ← Hapus expressPlugin sementara
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));