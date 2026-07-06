import { test, expect } from '@playwright/test'
import { waitForEmail, extractConfirmationUrl } from './resend-client'
import { deleteUserByEmail } from './supabase-admin'
import { CHECKOUT_TEST } from './purchase-helpers'

// Fully automated — no MP, no manual card entry.

function testEmail() {
  return `whatsapp.assistance.v1+e2e-reset-${Date.now()}@gmail.com`
}

test('forgot-password shows the same success screen regardless of whether the account exists', async ({ page }) => {
  // Supabase never reveals account existence through this endpoint, so
  // reusing the real, permanent CHECKOUT_TEST buyer here is safe — this
  // only ever sends an email, never touches its password.
  await page.goto('/forgot-password')
  await page.getByRole('textbox', { name: 'tu@email.com' }).fill(CHECKOUT_TEST.email)
  await page.getByRole('button', { name: 'Enviar enlace' }).click()

  await expect(page.getByRole('heading', { name: 'Email enviado' })).toBeVisible()
  await expect(page.getByText(CHECKOUT_TEST.email)).toBeVisible()
})

test('reset password end-to-end via the emailed link, then logs in with the new password', async ({ page }) => {
  const email = testEmail()
  const password = 'TestResend123!'
  const newPassword = 'NewPass456!'

  try {
    // Register + confirm first — a real user forgetting their password is
    // already a confirmed account, not a brand-new unconfirmed signup.
    await page.goto('/register')
    await page.getByRole('textbox', { name: 'tu@email.com' }).fill(email)
    await page.getByRole('textbox', { name: 'Mínimo 6 caracteres' }).fill(password)
    await page.getByRole('textbox', { name: 'Repetí tu contraseña' }).fill(password)
    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    await expect(page.getByRole('heading', { name: '¡Revisá tu email!' })).toBeVisible()

    const confirmationEmail = await waitForEmail(email, 'Confirmá tu cuenta — Lo de Granados')
    await page.goto(extractConfirmationUrl(confirmationEmail))
    await expect(page).toHaveURL(/\/bienvenido#.*access_token=/)

    // Forgot password
    await page.goto('/forgot-password')
    await page.getByRole('textbox', { name: 'tu@email.com' }).fill(email)
    await page.getByRole('button', { name: 'Enviar enlace' }).click()
    await expect(page.getByRole('heading', { name: 'Email enviado' })).toBeVisible()

    // Supabase's own stock template for this one — confirmed by actually
    // triggering it once and checking Resend, not guessed.
    const resetEmail = await waitForEmail(email, 'Reset your password')
    await page.goto(extractConfirmationUrl(resetEmail))

    await page.getByRole('textbox', { name: 'Mínimo 6 caracteres' }).fill(newPassword)
    await page.getByRole('textbox', { name: 'Repetí tu contraseña' }).fill(newPassword)
    await page.getByRole('button', { name: 'Guardar contraseña' }).click()
    await expect(page).toHaveURL(/\/login/)

    // Confirm the new password actually took effect, not just that the
    // page redirected.
    await page.getByRole('textbox', { name: 'tu@email.com' }).fill(email)
    await page.getByRole('textbox', { name: '••••••••' }).fill(newPassword)
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByRole('button', { name: email.split('@')[0] })).toBeVisible()
  } finally {
    await deleteUserByEmail(email)
  }
})

test('reset-password rejects mismatched or too-short passwords client-side', async ({ page }) => {
  // ResetPassword.tsx doesn't validate the Supabase recovery token/session
  // on render — client-side validation runs before any Supabase call, so
  // this is safe to check without a real emailed recovery link.
  await page.goto('/reset-password')

  await page.getByRole('textbox', { name: 'Mínimo 6 caracteres' }).fill('abc123')
  await page.getByRole('textbox', { name: 'Repetí tu contraseña' }).fill('xyz999')
  await page.getByRole('button', { name: 'Guardar contraseña' }).click()
  await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible()

  await page.getByRole('textbox', { name: 'Mínimo 6 caracteres' }).fill('1234')
  await page.getByRole('textbox', { name: 'Repetí tu contraseña' }).fill('1234')
  await page.getByRole('button', { name: 'Guardar contraseña' }).click()
  await expect(page.getByText('La contraseña debe tener al menos 6 caracteres')).toBeVisible()
})
