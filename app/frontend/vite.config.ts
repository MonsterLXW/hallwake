import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// T4: /api proxies to the HALLWAKE backend on 8401 (the scaffold's 8201 was
// wrong), and the dev server is pinned to the kiosk port 8402 — the backend
// CORS allowlist (architecture.md §10) is exactly this origin.
const backend = process.env.VITE_API_TARGET ?? "http://127.0.0.1:8401";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8402,
    proxy: { "/api": { target: backend, changeOrigin: true } },
  },
});
