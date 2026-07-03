import { test, expect } from '@playwright/test'
import { waitForEmail, extractConfirmationUrl } from './resend-client'
import { getCourseSpots, deleteEnrollmentsByEmail } from './supabase-admin'

// Mirrors purchase-cata.spec.ts — NOT for CI, pauses for a human to complete
// the MercadoPago card form (see memory: mp-sandbox-testing).
const TEST_CARD = {
  number: '5031 7557 3453 0604',
  holder: 'APRO',
  expiry: '11/30',
  cvv: '123',
  dni: '12345678',
}

const COURSE_ID = process.env.E2E_COURSE_ID ?? 'ed4bfb95-03ae-4270-a45e-4a31af54c240' // Sommelier Nivel Avanzado
const COURSE_PATH = process.env.E2E_COURSE_PATH ?? '/pichincha/cursos/ed4bfb95-03ae-4270-a45e-4a31af54c240'
const BUYER_EMAIL = `whatsapp.assistance.v1+cursotest${Date.now()}@gmail.com`
const BUYER_PASSWORD = 'TestResend123!'

test('enroll in a course end-to-end (manual card entry)', async ({ page }) => {
  const baseline = await getCourseSpots(COURSE_ID)

  // Fresh guest account so the checkout doesn't need a pre-existing login.
  await page.context().clearCookies()
  await page.goto('/register')
  await page.getByRole('textbox', { name: 'tu@email.com' }).fill(BUYER_EMAIL)
  await page.getByRole('textbox', { name: 'Mínimo 6 caracteres' }).fill(BUYER_PASSWORD)
  await page.getByRole('textbox', { name: 'Repetí tu contraseña' }).fill(BUYER_PASSWORD)
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page.getByRole('heading', { name: '¡Revisá tu email!' })).toBeVisible()

  // Confirm via the email link so the account has an active session.
  const confirmationEmail = await waitForEmail(BUYER_EMAIL, 'Confirmá tu cuenta — Lo de Granados')
  const confirmationUrl = extractConfirmationUrl(confirmationEmail)
  await page.goto(confirmationUrl)
  await expect(page).toHaveURL(/\/bienvenido/)

  await page.goto(COURSE_PATH)
  await page.getByRole('button', { name: 'Inscribirme' }).click()

  await page.getByRole('button', { name: 'Tarjeta Crédito, débito o' }).click()

  console.log(`\n>>> Complete the card form for ${BUYER_EMAIL} and click Pagar:`)
  console.log(TEST_CARD)
  await page.pause()

  await expect(page).toHaveURL(/\/pago-exitoso/, { timeout: 30_000 })
  await waitForEmail(BUYER_EMAIL, 'Tu inscripción está confirmada — Lo de Granados', { timeoutMs: 45_000 })

  expect(await getCourseSpots(COURSE_ID)).toBe(baseline - 1)

  await deleteEnrollmentsByEmail(COURSE_ID, BUYER_EMAIL)
  expect(await getCourseSpots(COURSE_ID)).toBe(baseline)
})
