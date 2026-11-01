import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', timeout: 120000, expect: { timeout: 10000 },
  fullyParallel: false, workers: 1, retries: 0,
  // Optional isolated production server owned by this test run; never stop or
  // depend on the user's interactive development server for focused QA.
  webServer: process.env.QA_MANAGED_SERVER ? { command: 'npm run preview -- --port 4340', url: 'http://127.0.0.1:4340', reuseExistingServer: true, timeout: 30000 } : undefined,
  reporter: [['list'], ['json', { outputFile: `artifacts/testing/${process.env.QA_ROUND || 'round-1'}-results.json` }]],
  use: { baseURL: process.env.QA_BASE_URL || 'http://127.0.0.1:4326', channel: 'chrome', viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure', screenshot: 'only-on-failure', launchOptions: { args: ['--enable-webgl', '--use-gl=angle', `--use-angle=${process.env.QA_GL || 'swiftshader'}`, '--enable-unsafe-swiftshader'] } },
});
