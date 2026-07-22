import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    browserName: 'chromium',
    channel: 'chrome',
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
        channel: 'chrome',
      },
    },
    {
      name: 'desktop',
      use: {
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
})
