import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// In development the browser talks to the API through the dev server, so it sees a single origin and CORS never
// comes into it. In production the page (Vercel) and the API (Render) are different origins: the build is given the
// API's address in VITE_API_URL and the API lists the page's origin in CORS_ORIGIN (see DEPLOYMENT.md).
const apiProxy = { "/api": "http://localhost:3000" };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true, proxy: apiProxy },
  preview: { port: 4173, strictPort: true, proxy: apiProxy },
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    // The UI tests type into real fields and re-render a list on each key; on a slow machine, or with
    // coverage on, the default 5 seconds is too tight for the heaviest of them.
    testTimeout: 15_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx", "src/vite-env.d.ts", "src/**/*.test.{ts,tsx}", "src/test/**"],
    },
  },
});
