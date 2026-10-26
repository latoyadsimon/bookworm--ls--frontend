import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vitest: fast unit tests for the logic layer. Browser tests live in tests/e2e (Playwright).
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
  },
})
