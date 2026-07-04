import { expect, type Page } from '@playwright/test'
import { waitForEmail, extractConfirmationUrl } from './resend-client'

// Shared by every purchase-*.spec.ts file — NOT for CI, since payWithTestCard
// pauses mid-test waiting for a human to complete the MercadoPago card form.
// MP's checkout blocks automated pointer events on the entire card-form page
// (not just the Pagar button), so there's no way to script past it (see
// memory: mp-sandbox-testing). Run with `npx playwright test <name> --headed`
// and complete the card form yourself when the Inspector pops up.
export const TEST_CARD = {
  number: '5031 7557 3453 0604', // Mastercard sandbox
  holder: 'APRO', // triggers an approved payment
  expiry: '11/30',
  cvv: '123',
  dni: '12345678',
}

// Registers a fresh guest account and confirms it via the email link, so the
// page ends up with an active session on /bienvenido.
export async function registerAndConfirm(page: Page, email: string, password: string): Promise<void> {
  await page.context().clearCookies()
  await page.goto('/register')
  await page.getByRole('textbox', { name: 'tu@email.com' }).fill(email)
  await page.getByRole('textbox', { name: 'Mínimo 6 caracteres' }).fill(password)
  await page.getByRole('textbox', { name: 'Repetí tu contraseña' }).fill(password)
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page.getByRole('heading', { name: '¡Revisá tu email!' })).toBeVisible()

  const confirmationEmail = await waitForEmail(email, 'Confirmá tu cuenta — Lo de Granados')
  await page.goto(extractConfirmationUrl(confirmationEmail))
  await expect(page).toHaveURL(/\/bienvenido/)
}

// Call once the checkout has already redirected to MercadoPago and "Tarjeta"
// is about to be (or has been) selected — completes the guest-checkout card
// step, then waits for the human, then confirms the redirect back succeeded.
export async function payWithTestCard(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: 'Tarjeta Crédito, débito o' }).click()

  console.log(`\n>>> Complete the card form for ${label} and click Pagar:`)
  console.log(TEST_CARD)
  await page.pause()

  await expect(page).toHaveURL(/\/pago-exitoso/, { timeout: 30_000 })
}

// Club DeVinos subscriptions redirect to MercadoPago's separate
// subscription/PreApproval checkout — a genuinely different UI from the
// one-off checkout/preferences flow payWithTestCard above handles (confirmed
// by walking through it directly): accept terms → choose payment method
// (labeled just "Tarjeta Crédito", not "Tarjeta Crédito, débito o") → card
// form. Same manual-pause pattern from there.
export async function payWithTestCardSubscription(page: Page, label: string): Promise<void> {
  await page.getByRole('checkbox', { name: /Acepto los Términos y condiciones/ }).click()
  await page.getByRole('button', { name: 'Elegir medio de pago' }).click()
  await page.getByRole('button', { name: 'Tarjeta Crédito' }).click()

  console.log(`\n>>> Complete the card form for ${label} and click Pagar:`)
  console.log(TEST_CARD)
  await page.pause()

  await expect(page).toHaveURL(/\/pago-exitoso/, { timeout: 30_000 })
}
