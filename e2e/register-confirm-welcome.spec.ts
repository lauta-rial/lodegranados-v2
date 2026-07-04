import { test, expect } from '@playwright/test'
import { waitForEmail, extractConfirmationUrl } from './resend-client'
import { deleteUserByEmail } from './supabase-admin'

// Uses a Gmail "+" alias so all test signups land in one real inbox
// (whatsapp.assistance.v1@gmail.com) without colliding with each other.
// This test genuinely needs a fresh account every run (it's testing
// registration itself) — unlike purchase-*.spec.ts, which share one
// persistent buyer account precisely because they don't need that.
function testEmail() {
  return `whatsapp.assistance.v1+e2e-${Date.now()}@gmail.com`
}

test('register -> confirm email -> welcome email fires only after confirmation', async ({ page }) => {
  const email = testEmail()
  const password = 'TestResend123!'

  try {
    await page.goto('/register')
    await page.getByRole('textbox', { name: 'tu@email.com' }).fill(email)
    await page.getByRole('textbox', { name: 'Mínimo 6 caracteres' }).fill(password)
    await page.getByRole('textbox', { name: 'Repetí tu contraseña' }).fill(password)
    await page.getByRole('button', { name: 'Crear cuenta' }).click()

    await expect(page.getByRole('heading', { name: '¡Revisá tu email!' })).toBeVisible()

    const confirmationEmail = await waitForEmail(email, 'Confirmá tu cuenta — Lo de Granados')
    const confirmationUrl = extractConfirmationUrl(confirmationEmail)

    await page.goto(confirmationUrl)
    await expect(page).toHaveURL(/\/bienvenido#.*access_token=/)
    await expect(page.getByRole('heading', { name: /¡Bienvenido/ })).toBeVisible()

    const welcomeEmail = await waitForEmail(email, 'Bienvenido/a a Lo de Granados')

    expect(new Date(welcomeEmail.created_at).getTime()).toBeGreaterThan(
      new Date(confirmationEmail.created_at).getTime(),
    )
  } finally {
    // Without this, every run leaves a permanent +e2e-<timestamp> account
    // behind — confirmed 24+ of these had piled up in auth.users from past
    // sessions before today's cleanup.
    await deleteUserByEmail(email)
  }
})
