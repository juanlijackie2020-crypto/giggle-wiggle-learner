import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 300000,
  workers: 1,
  expect: { timeout: 20000 },
  use: {
    screenshot: "only-on-failure",
    baseURL: "http://127.0.0.1:5173",
    viewport: { width: 1024, height: 768 },
    launchOptions: {
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : {}),
      args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
    },
  },
  webServer: [
    {
      command: "npm run dev -- --port 5173",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: "node scripts/serve-pages.mjs",
      url: "http://127.0.0.1:4174/giggle-wiggle-learner/",
      reuseExistingServer: !process.env.CI,
      timeout: 10000,
    },
  ],
});
