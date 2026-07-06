import { test, expect } from '@playwright/test'
import { loginCheckoutTester, CHECKOUT_TEST } from './purchase-helpers'
import { getUserIdByEmail, insertRegistration, deleteRegistration, insertEnrollment, deleteEnrollment } from './supabase-admin'

// Fully automated — no MP, no manual card entry. Requires
// SUPABASE_SERVICE_ROLE_KEY to seed real rows for CHECKOUT_TEST.

const MALBEC_EVENT_ID = '09e0bd67-0667-497d-a055-a0169817a207' // Cata de Malbec Mendocino
const SOMMELIER_COURSE_ID = 'ed4bfb95-03ae-4270-a45e-4a31af54c240' // Sommelier Nivel Avanzado

test.describe('MiCuenta', () => {
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, 'requires SUPABASE_SERVICE_ROLE_KEY')

  test('"Mis datos" autosaves on blur', async ({ page }) => {
    await loginCheckoutTester(page)
    await page.goto('/mi-cuenta')

    await expect(page.getByRole('heading', { name: 'Mis datos' })).toBeVisible()
    // The "Teléfono" <label> isn't htmlFor-linked to its <input> (plain
    // sibling, checked in source) — getByLabel won't match it, so this
    // goes by placeholder instead, like the rest of this form's fields.
    const phoneInput = page.getByPlaceholder('+54 9 261 000 0000')
    const phone = `341${Date.now().toString().slice(-7)}`
    await phoneInput.fill(phone)
    await phoneInput.blur()
    await expect(page.getByText('Guardado')).toBeVisible()

    // Confirms the value actually persisted, not just that the UI flashed
    // "Guardado" — reload and re-read the field.
    await page.reload()
    await expect(page.getByPlaceholder('+54 9 261 000 0000')).toHaveValue(phone)
  })

  test('a real reservation and enrollment render with the correct data, then disappear once removed', async ({ page }) => {
    const userId = await getUserIdByEmail(CHECKOUT_TEST.email)
    expect(userId).toBeTruthy()

    let registrationId: string | undefined
    let enrollmentId: string | undefined
    try {
      registrationId = await insertRegistration(MALBEC_EVENT_ID, 1, userId!)
      enrollmentId = await insertEnrollment(SOMMELIER_COURSE_ID, userId!)

      await loginCheckoutTester(page)
      await page.goto('/mi-cuenta')

      await expect(page.getByRole('heading', { name: 'Mis catas' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Cata de Malbec Mendocino' })).toBeVisible()
      await expect(page.getByText('Confirmada')).toBeVisible() // AttendanceBadge — registrations.attended defaults to false, not null

      await page.getByRole('button', { name: /QR/ }).first().click()
      await expect(page.getByAltText(/QR entrada/).first()).toBeVisible()

      await expect(page.getByRole('heading', { name: 'Mis cursos' })).toBeVisible()
      await expect(page.getByText('Sommelier Nivel Avanzado')).toBeVisible()
      await expect(page.getByText('Inscripto')).toBeVisible()
    } finally {
      if (registrationId) await deleteRegistration(registrationId)
      if (enrollmentId) await deleteEnrollment(enrollmentId)
    }

    // Reload after cleanup — confirms the section actually reflects DB
    // state (queried live), not a cached snapshot from before deletion.
    await page.reload()
    await expect(page.getByText('No tenés reservas todavía.')).toBeVisible()
    await expect(page.getByText('No estás inscripto en ningún curso.')).toBeVisible()
  })
})
