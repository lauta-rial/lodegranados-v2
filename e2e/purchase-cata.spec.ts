import { test, expect, type Page } from '@playwright/test'
import { waitForEmail } from './resend-client'
import { getAvailableSpots, setAvailableSpots, getRegistrationsCount } from './supabase-admin'
import { payWithTestCard, loginCheckoutTester, CHECKOUT_TEST } from './purchase-helpers'

const EVENT_ID = process.env.E2E_EVENT_ID ?? '09e0bd67-0667-497d-a055-a0169817a207'
const EVENT_PATH = process.env.E2E_EVENT_PATH ?? '/pichincha/catas/09e0bd67-0667-497d-a055-a0169817a207'

// Admin credentials aren't hardcoded (they're real prod credentials) — pass
// them as env vars. Without both, the admin-panel assertion is skipped.
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD

async function readDashboardKpi(page: Page, label: string): Promise<number> {
  const card = page.locator(
    `xpath=//p[normalize-space(text())="${label}"]/ancestor::div[contains(@class,"rounded-xl")][1]`
  )
  const text = await card.locator('p.font-display').innerText()
  return parseInt(text.trim(), 10)
}

// Two separate purchases by the same persistent CHECKOUT_TEST buyer — used
// to be two different disposable accounts, but nothing about spot-decrement
// correctness depends on the buyer's identity, only on two distinct
// registrations existing. Using one reusable account avoids piling up more
// throwaway auth.users rows (see CHECKOUT_TEST in purchase-helpers.ts).
async function buyTickets(page: Page, spots: number) {
  await loginCheckoutTester(page)

  await page.goto(EVENT_PATH)
  for (let i = 1; i < spots; i++) {
    await page.getByRole('button', { name: '+', exact: true }).click()
  }
  await page.getByRole('button', { name: /^Reservar/ }).click()

  await payWithTestCard(page, `${CHECKOUT_TEST.email} (${spots} entrada(s))`)
  await waitForEmail(CHECKOUT_TEST.email, 'Tu reserva está confirmada — Lo de Granados', { timeoutMs: 45_000 })
}

test.describe('cata purchase — spots decrement correctly across purchases', () => {
  let baselineSpots: number

  test.beforeAll(async () => {
    baselineSpots = await getAvailableSpots(EVENT_ID)
  })

  test.afterAll(async () => {
    await setAvailableSpots(EVENT_ID, baselineSpots)
  })

  test('same buyer reserves 1 spot, then reserves 2 more', async ({ page }) => {
    const baselineRegistrations = await getRegistrationsCount(EVENT_ID)

    await buyTickets(page, 1)
    expect(await getAvailableSpots(EVENT_ID)).toBe(baselineSpots - 1)

    await page.evaluate(() => localStorage.clear())
    await buyTickets(page, 2)
    expect(await getAvailableSpots(EVENT_ID)).toBe(baselineSpots - 3)

    // Optional: confirm the admin dashboard's "Inscripciones a catas" KPI
    // reflects the 2 new registration rows (one per purchase — the count is
    // rows, not entradas/spots). Skipped unless admin creds are provided via env vars.
    if (ADMIN_EMAIL && ADMIN_PASSWORD && baselineRegistrations !== null) {
      await page.context().clearCookies()
      await page.evaluate(() => localStorage.clear())

      await page.goto('/login')
      await page.getByRole('textbox', { name: 'tu@email.com' }).fill(ADMIN_EMAIL)
      await page.getByRole('textbox', { name: '••••••••' }).fill(ADMIN_PASSWORD)
      await page.getByRole('button', { name: 'Ingresar' }).click()

      await page.goto('/admin')
      await expect(page.getByText('Inscripciones a catas')).toBeVisible()
      const shown = await readDashboardKpi(page, 'Inscripciones a catas')
      expect(shown).toBe(baselineRegistrations + 2)
    } else {
      console.warn('E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set — skipping admin dashboard assertion.')
    }
  })
})
