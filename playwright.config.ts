import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'

// dotenv doesn't override already-set vars by default, so CI/shell env still
// takes priority over .env.local.
loadEnv({ path: '.env.local' })

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  // Several specs (purchase-cata, host-role, admin-access-control,
  // payment-security, scanner, spots-integrity) share real fixture rows
  // against the same live Supabase project — there's no per-worker
  // isolation like a local DB branch would give. Playwright's default of
  // running spec *files* concurrently across workers let two of them race
  // on the same event's available_spots, producing flaky failures that
  // had nothing to do with the code under test (confirmed: same suite,
  // same code, passes reliably at workers:1). Since this project's free
  // Supabase plan has no real branching for test isolation, forcing serial
  // execution here is the correct fix, not a workaround.
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'https://lodegranados-v2-chi.vercel.app',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
