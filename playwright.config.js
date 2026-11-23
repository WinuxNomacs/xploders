import { defineConfig } from '@playwright/test'

const port = 8123

export default defineConfig({
  testDir: 'test/browser',
  use: { baseURL: `http://127.0.0.1:${port}`, browserName: 'chromium', headless: true },
  webServer: {
    command: 'node scripts/dev.js',
    env: { PORT: String(port) },
    url: `http://127.0.0.1:${port}/demo/`,
    reuseExistingServer: false,
  },
})
