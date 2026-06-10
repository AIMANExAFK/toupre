import { defineConfig } from "@playwright/test";

// E2E LocaShare — utilise le Chrome installé sur la machine (channel "chrome"),
// aucun téléchargement de navigateur Playwright nécessaire.
// Prérequis : mongod + backend :8000 + preview :4174 lancés par ../run-e2e.sh
export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4174",
    channel: "chrome",
    headless: true,
    viewport: { width: 430, height: 900 },
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    screenshot: "only-on-failure",
  },
});
