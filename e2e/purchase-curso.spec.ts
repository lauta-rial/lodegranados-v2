import { test, expect } from '@playwright/test'
import { waitForEmail } from './resend-client'
import { getCourseSpots, deleteEnrollmentsByEmail } from './supabase-admin'
import { loginCheckoutTester, payWithTestCard, CHECKOUT_TEST } from './purchase-helpers'

const COURSE_ID = process.env.E2E_COURSE_ID ?? 'ed4bfb95-03ae-4270-a45e-4a31af54c240' // Sommelier Nivel Avanzado
const COURSE_PATH = process.env.E2E_COURSE_PATH ?? '/pichincha/cursos/ed4bfb95-03ae-4270-a45e-4a31af54c240'

test('enroll in a course end-to-end (manual card entry)', async ({ page }) => {
  const baseline = await getCourseSpots(COURSE_ID)

  await loginCheckoutTester(page)

  await page.goto(COURSE_PATH)
  await page.getByRole('button', { name: 'Inscribirme' }).click()
  await payWithTestCard(page, CHECKOUT_TEST.email)

  await waitForEmail(CHECKOUT_TEST.email, 'Tu inscripción está confirmada — Lo de Granados', { timeoutMs: 45_000 })

  expect(await getCourseSpots(COURSE_ID)).toBe(baseline - 1)

  await deleteEnrollmentsByEmail(COURSE_ID, CHECKOUT_TEST.email)
  expect(await getCourseSpots(COURSE_ID)).toBe(baseline)
})
