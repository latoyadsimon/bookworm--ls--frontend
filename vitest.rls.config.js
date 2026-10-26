import { defineConfig } from 'vitest/config'

// User-isolation tests against the live Supabase project (network; signs in as seed readers).
// Kept apart from the unit tests, which never touch the network.
export default defineConfig({
  test: {
    include: ['tests/rls/**/*.test.js'],
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 30000,
  },
})
