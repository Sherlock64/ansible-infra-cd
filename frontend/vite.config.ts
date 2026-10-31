import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Django serves the build output under /static/ (WhiteNoise), so asset URLs
// must be prefixed accordingly. In dev, the app is served from "/" and /api is
// proxied to Django.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/static/" : "/",
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: { "/api": "http://localhost:8000" },
  },
}));
