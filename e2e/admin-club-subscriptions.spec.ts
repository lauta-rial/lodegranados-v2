import { test, expect } from '@playwright/test'
import { SUPERADMIN, loginAdmin } from './admin-helpers'

// The admin Club "Suscripciones" tab must show, per subscriber, whether this
// month's wines were picked up (the Retiro column) plus a summary line. There
// are active subscriptions in the DB (superadmin's Esencial, etc.), none
// redeemed this month → all "Pendiente".
test('admin Club subscriptions shows the monthly pickup (Retiro) column', async ({ page }) => {
  await loginAdmin(page, SUPERADMIN)
  await page.goto('/admin/club')

  await page.getByRole('button', { name: 'Suscripciones' }).click()

  await expect(page.getByRole('columnheader', { name: /Retiro/ })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Suscriptor' })).toBeVisible()
  await expect(page.getByText(/suscriptor(es)? activo/)).toBeVisible()
  // Scope to the table — "Pendiente" also appears as a hidden <option> in the
  // status filter above it.
  await expect(page.getByRole('table').getByText('Pendiente').first()).toBeVisible()
})
