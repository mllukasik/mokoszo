import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    // base bez /mokoszo/ — paths w testach piszemy z /mokoszo/ prefixem
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    // astro build jest wymagane przed testami; preview serwuje dist/
    command: 'npm run preview -- --port 4321',
    url: 'http://localhost:4321/mokoszo/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
