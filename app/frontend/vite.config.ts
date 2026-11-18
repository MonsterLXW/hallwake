import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const backend = process.env.VITE_API_TARGET ?? "http://127.0.0.1:8201";

export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": { target: backend, changeOrigin: true } } },
});
