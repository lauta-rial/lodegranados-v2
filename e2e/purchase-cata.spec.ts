import { test, expect, type Page } from '@playwright/test'
import { waitForEmail } from './resend-client'
import { getAvailableSpots, setAvailableSpots, getRegistrationsCount } from './supabase-admin'

// NOT for CI — this pauses mid-test (page.pause()) waiting for a human to
// complete the MercadoPago card form. MP's checkout blocks automated pointer
// events on the entire card-form page (not just the Pagar button), so there's
// no way to script past it. Run with `npx playwright test purchase-cata --headed`
// and complete the card form yourself when the Inspector pops up.
//
// MercadoPago sandbox test card (see memory: mp-sandbox-testing):
const TEST_CARD = {
  number: '5031 7557 3453 0604', // Mastercard sandbox
  holder: 'APRO', // triggers an approved payment
  expiry: '11/30',
  cvv: '123',
  dni: '12345678',
}

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

async function buyTickets(page: Page, email: string, password: string, spots: number) {
  // Clear MP cookies from any previous run in this browser — if the checkout
  // finds a logged-in MP test account matching the seller, it fails with
  // "una de las partes es de prueba" instead of showing guest checkout.
  await page.context().clearCookies()

  await page.goto('/login')
  await page.getByRole('textbox', { name: 'tu@email.com' }).fill(email)
  await page.getByRole('textbox', { name: '••••••••' }).fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()

  await page.goto(EVENT_PATH)
  for (let i = 1; i < spots; i++) {
    await page.getByRole('button', { name: '+', exact: true }).click()
  }
  await page.getByRole('button', { name: /^Reservar/ }).click()

  await page.getByRole('button', { name: 'Tarjeta Crédito, débito o' }).click()

  console.log(`\n>>> Complete the card form for ${email} (${spots} entrada(s)) and click Pagar:`)
  console.log(TEST_CARD)
  await page.pause()

  await expect(page).toHaveURL(/\/pago-exitoso/, { timeout: 30_000 })
  await waitForEmail(email, 'Tu reserva está confirmada — Lo de Granados', { timeoutMs: 45_000 })
}

test.describe('cata purchase — spots decrement correctly across buyers', () => {
  let baselineSpots: number

  test.beforeAll(async () => {
    baselineSpots = await getAvailableSpots(EVENT_ID)
  })

  test.afterAll(async () => {
    await setAvailableSpots(EVENT_ID, baselineSpots)
  })

  test('buyer A reserves 1 spot, buyer B (different account) reserves 2', async ({ page }) => {
    const baselineRegistrations = await getRegistrationsCount(EVENT_ID)

    await buyTickets(page, 'whatsapp.assistance.v1+uitest2@gmail.com', 'TestResend123!', 1)
    expect(await getAvailableSpots(EVENT_ID)).toBe(baselineSpots - 1)

    await page.evaluate(() => localStorage.clear())
    await buyTickets(page, 'whatsapp.assistance.v1+confirmflow@gmail.com', 'TestResend123!', 2)
    expect(await getAvailableSpots(EVENT_ID)).toBe(baselineSpots - 3)

    // Optional: confirm the admin dashboard's "Inscripciones a catas" KPI
    // reflects the 2 new registration rows (one per buyer — the count is rows,
    // not entradas/spots). Skipped unless admin creds are provided via env vars.
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
