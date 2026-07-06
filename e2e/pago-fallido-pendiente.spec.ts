import { test, expect } from '@playwright/test'

// Fully automated, no login/MP needed — these are the two non-happy MP
// redirect targets that only purchase-*.spec.ts's happy path (pago-exitoso)
// had any coverage of until now.

const MALBEC_EVENT_ID = '09e0bd67-0667-497d-a055-a0169817a207' // Cata de Malbec Mendocino

test.describe('PagoFallido', () => {
  test('with a cached checkout + type/ref: offers a specific retry link and WhatsApp contact', async ({ page }) => {
    // getMpCheckout() reads this synchronously during render, not in an
    // effect — has to exist before the page's own script runs, hence
    // addInitScript rather than page.evaluate after navigation.
    await page.addInitScript(() => {
      sessionStorage.setItem('mp_checkout', JSON.stringify({ branchSlug: 'pichincha' }))
    })
    await page.goto(`/pago-fallido?type=event&ref=${MALBEC_EVENT_ID}`)

    await expect(page.getByRole('heading', { name: 'El pago no se completó' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Intentar de nuevo' })).toHaveAttribute(
      'href', `/pichincha/catas/${MALBEC_EVENT_ID}`,
    )
    await expect(page.getByRole('link', { name: 'Contactar por WhatsApp' })).toHaveAttribute(
      'href', /^https:\/\/wa\.me\/\d+$/,
    )
  })

  test('without a cached checkout or query params: falls back to a generic "volver al inicio"', async ({ page }) => {
    await page.goto('/pago-fallido')

    await expect(page.getByRole('heading', { name: 'El pago no se completó' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
    await expect(page.getByRole('link', { name: 'Intentar de nuevo' })).toHaveCount(0)
  })
})

test.describe('PagoPendiente', () => {
  test('shows the static pending message with links to MiCuenta and WhatsApp', async ({ page }) => {
    // Doesn't read type/ref/mp_checkout at all — no setup needed.
    await page.goto('/pago-pendiente')

    await expect(page.getByRole('heading', { name: 'Pago en proceso' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ver mis reservas' })).toHaveAttribute('href', '/mi-cuenta')
    await expect(page.getByRole('link', { name: 'Consultar por WhatsApp' })).toHaveAttribute(
      'href', /^https:\/\/wa\.me\/\d+$/,
    )
  })
})
