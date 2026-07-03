import { test, expect } from '@playwright/test'
import { waitForEmail, extractConfirmationUrl } from './resend-client'
import { deleteLatestSubscription } from './supabase-admin'

// Mirrors purchase-cata.spec.ts — NOT for CI, pauses for a human to complete
// the MercadoPago card form (see memory: mp-sandbox-testing).
const TEST_CARD = {
  number: '5031 7557 3453 0604',
  holder: 'APRO',
  expiry: '11/30',
  cvv: '123',
  dni: '12345678',
}

const PLAN_ID = process.env.E2E_PLAN_ID ?? '8175c125-0969-4975-98ea-3fcefd87fbb2' // Gran Reserva
const PLAN_PATH = process.env.E2E_PLAN_PATH ?? '/pichincha/club/8175c125-0969-4975-98ea-3fcefd87fbb2'
const BUYER_EMAIL = `whatsapp.assistance.v1+clubtest${Date.now()}@gmail.com`
const BUYER_PASSWORD = 'TestResend123!'

test('subscribe to a Club plan end-to-end (manual card entry)', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/register')
  await page.getByRole('textbox', { name: 'tu@email.com' }).fill(BUYER_EMAIL)
  await page.getByRole('textbox', { name: 'Mínimo 6 caracteres' }).fill(BUYER_PASSWORD)
  await page.getByRole('textbox', { name: 'Repetí tu contraseña' }).fill(BUYER_PASSWORD)
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page.getByRole('heading', { name: '¡Revisá tu email!' })).toBeVisible()

  const confirmationEmail = await waitForEmail(BUYER_EMAIL, 'Confirmá tu cuenta — Lo de Granados')
  await page.goto(extractConfirmationUrl(confirmationEmail))
  await expect(page).toHaveURL(/\/bienvenido/)

  await page.goto(PLAN_PATH)
  await page.getByRole('button', { name: /^Suscribirme/ }).click()

  await page.getByRole('button', { name: 'Tarjeta Crédito, débito o' }).click()

  console.log(`\n>>> Complete the card form for ${BUYER_EMAIL} and click Pagar:`)
  console.log(TEST_CARD)
  await page.pause()

  await expect(page).toHaveURL(/\/pago-exitoso/, { timeout: 30_000 })
  await waitForEmail(BUYER_EMAIL, 'Bienvenido/a al Club DeVinos — Lo de Granados', { timeoutMs: 45_000 })

  await deleteLatestSubscription(PLAN_ID)
})
