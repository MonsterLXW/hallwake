import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { execSync } from "node:child_process";

// Build stamp: the attract screen shows the git hash so a stale kiosk tab is
// instantly recognizable (this class of "controls still wrong!" bug was a
// browser running an old bundle).
let hwBuild = "dev";
try {
  hwBuild = execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  /* no git in the build env: stamp stays "dev" */
}

// T4: /api proxies to the HALLWAKE backend on 8401 (the scaffold's 8201 was
// wrong), and the dev server is pinned to the kiosk port 8402 — the backend
// CORS allowlist (architecture.md §10) is exactly this origin.
const backend = process.env.VITE_API_TARGET ?? "http://127.0.0.1:8401";

export default defineConfig({
  plugins: [react()],
  define: { __HW_BUILD__: JSON.stringify(hwBuild) },
  server: {
    port: 8402,
    proxy: { "/api": { target: backend, changeOrigin: true } },
  },
});
