import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  outputDir: "artifacts/test-results",
  use: { baseURL: "http://127.0.0.1:3100", channel: "chrome", viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" },
  webServer: { command: "NORTHWIND_BACKEND_URL=http://127.0.0.1:8999 npm start -- --hostname 127.0.0.1 --port 3100", url: "http://127.0.0.1:3100/dashboard", reuseExistingServer: false },
});
