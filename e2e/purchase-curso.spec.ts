import { test, expect } from '@playwright/test'
import { waitForEmail } from './resend-client'
import { getCourseSpots, deleteEnrollmentsByEmail } from './supabase-admin'
import { registerAndConfirm, payWithTestCard } from './purchase-helpers'

const COURSE_ID = process.env.E2E_COURSE_ID ?? 'ed4bfb95-03ae-4270-a45e-4a31af54c240' // Sommelier Nivel Avanzado
const COURSE_PATH = process.env.E2E_COURSE_PATH ?? '/pichincha/cursos/ed4bfb95-03ae-4270-a45e-4a31af54c240'
const BUYER_EMAIL = `whatsapp.assistance.v1+cursotest${Date.now()}@gmail.com`
const BUYER_PASSWORD = 'TestResend123!'

test('enroll in a course end-to-end (manual card entry)', async ({ page }) => {
  const baseline = await getCourseSpots(COURSE_ID)

  await registerAndConfirm(page, BUYER_EMAIL, BUYER_PASSWORD)

  await page.goto(COURSE_PATH)
  await page.getByRole('button', { name: 'Inscribirme' }).click()
  await payWithTestCard(page, BUYER_EMAIL)

  await waitForEmail(BUYER_EMAIL, 'Tu inscripción está confirmada — Lo de Granados', { timeoutMs: 45_000 })

  expect(await getCourseSpots(COURSE_ID)).toBe(baseline - 1)

  await deleteEnrollmentsByEmail(COURSE_ID, BUYER_EMAIL)
  expect(await getCourseSpots(COURSE_ID)).toBe(baseline)
})
