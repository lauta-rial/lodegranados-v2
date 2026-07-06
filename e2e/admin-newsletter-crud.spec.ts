import { test, expect } from '@playwright/test'
import { SUPERADMIN, loginAdmin } from './admin-helpers'
import { deleteNewsletterSubscriberByEmail } from './supabase-admin'

// Fully automated — no MP, no manual card entry. admin-access-control.spec.ts
// already covers that /admin/newsletter is superadmin-only; this exercises
// the CRUD itself.

test('add a subscriber, reject a duplicate, then delete it from the row', async ({ page }) => {
  const email = `whatsapp.assistance.v1+e2e-admin-newsletter-${Date.now()}@gmail.com`

  await loginAdmin(page, SUPERADMIN)
  await page.goto('/admin/newsletter')

  try {
    await page.getByRole('button', { name: 'Agregar' }).click()
    await page.getByPlaceholder('nombre@email.com').fill(email)
    await page.getByRole('button', { name: 'Agregar' }).last().click()

    const row = page.getByRole('row', { name: new RegExp(email.replace(/[.+]/g, '\\$&')) })
    await expect(row).toBeVisible()

    // Same email again — the "Agregar" button in the header reopens the
    // modal (the one just used to submit is inside it and unmounts on
    // success), so re-select by role again rather than reuse a stale handle.
    await page.getByRole('button', { name: 'Agregar' }).first().click()
    await page.getByPlaceholder('nombre@email.com').fill(email)
    await page.getByRole('button', { name: 'Agregar' }).last().click()
    await expect(page.getByText('Este email ya está suscripto.')).toBeVisible()
    await page.getByRole('button', { name: 'Cancelar' }).click()

    page.once('dialog', (d) => d.accept())
    await row.getByRole('button', { name: 'Eliminar suscriptor' }).click()
    await expect(row).toHaveCount(0)
  } finally {
    await deleteNewsletterSubscriberByEmail(email)
  }
})
