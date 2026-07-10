import { test, expect } from '@playwright/test'
import { SUPERADMIN, loginAdmin } from './admin-helpers'

// The superadmin account holds an active Esencial Club subscription, so it
// doubles as a "subscribed member" for these member-facing QR views. Login is
// via the admin form (same Supabase session works across the whole app).
const ESENCIAL_PLAN = '130f5c67-e1dc-494e-8d39-767b10deeafe'

test.describe('Club member QR (subscribed user)', () => {
  test('Mi Cuenta shows the subscription card with its redemption QR', async ({ page }) => {
    await loginAdmin(page, SUPERADMIN)
    await page.goto('/mi-cuenta')

    await expect(page.getByRole('heading', { name: 'Club DeVinos' })).toBeVisible()
    await expect(page.getByText('Esencial')).toBeVisible()

    await page.getByRole('button', { name: /Ver QR/ }).first().click()
    await expect(page.getByAltText('QR de tu suscripción al Club')).toBeVisible()
    await expect(page.getByText(/retirar los vinos de/i)).toBeVisible()
  })

  test('ClubPlan detail shows "already subscribed" + QR instead of the pay button', async ({ page }) => {
    await loginAdmin(page, SUPERADMIN)
    await page.goto(`/pichincha/club/${ESENCIAL_PLAN}`)

    await expect(page.getByText('Ya estás suscripto a este plan.')).toBeVisible()
    await expect(page.getByAltText('QR de tu suscripción al Club')).toBeVisible()
    // The subscribe button must NOT be there for an already-subscribed user.
    await expect(page.getByRole('button', { name: /Suscribirme al Esencial/ })).toHaveCount(0)
  })
})
