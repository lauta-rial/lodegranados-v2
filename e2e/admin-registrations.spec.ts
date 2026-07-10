import { test, expect } from '@playwright/test'
import { SUPERADMIN, loginAdmin } from './admin-helpers'

// The cata "Inscripciones" tab: the spots column is now "Entradas", and
// "Asistió" is read-only (— / SÍ / NO), driven by the attendance triggers — no
// clickable toggle. Uses the seeded Test User inscripciones (all pending → —).
test('admin cata registrations show Entradas + read-only Asistió', async ({ page }) => {
  await loginAdmin(page, SUPERADMIN)
  await page.goto('/admin/catas')

  await page.getByRole('button', { name: 'Inscripciones' }).click()

  await expect(page.getByRole('columnheader', { name: 'Entradas' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Asistió' })).toBeVisible()
  await expect(page.getByRole('cell', { name: /Test User/ }).first()).toBeVisible()

  // Read-only: there is no attendance <button> in the table body.
  const table = page.getByRole('table')
  await expect(table.getByRole('button')).toHaveCount(0)
})
