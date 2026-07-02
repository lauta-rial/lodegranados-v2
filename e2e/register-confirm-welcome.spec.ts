import { test, expect } from '@playwright/test'
import { waitForEmail, extractConfirmationUrl } from './resend-client'

// Uses a Gmail "+" alias so all test signups land in one real inbox
// (whatsapp.assistance.v1@gmail.com) without colliding with each other.
function testEmail() {
  return `whatsapp.assistance.v1+e2e-${Date.now()}@gmail.com`
}

test('register -> confirm email -> welcome email fires only after confirmation', async ({ page }) => {
  const email = testEmail()
  const password = 'TestResend123!'

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
})
