import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  worker: { format: "es" },
  // `npm run dev` has no Pages Functions; forward /api to `npm run pages:dev`
  server: { proxy: { "/api": "http://localhost:8788" } },
});
