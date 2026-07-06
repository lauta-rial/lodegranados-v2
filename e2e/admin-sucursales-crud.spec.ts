import { test, expect } from '@playwright/test'
import { SUPERADMIN, loginAdmin } from './admin-helpers'
import { getBranchBySlug, deleteBranchBySlug } from './supabase-admin'

// Fully automated — no MP, no manual card entry. admin-access-control.spec.ts
// already covers that /admin/sucursales is superadmin-only; this exercises
// the CRUD itself, which nothing did before.

test('create, edit, and delete a throwaway branch as superadmin', async ({ page }) => {
  const slug = `e2e-branch-${Date.now()}`
  const name = `E2E Branch ${Date.now()}`
  const renamedName = `${name} (editado)`

  await loginAdmin(page, SUPERADMIN)
  await page.goto('/admin/sucursales')

  try {
    await page.getByRole('button', { name: 'Nueva sucursal' }).click()
    // getByPlaceholder matches case-insensitively without exact: true —
    // "Pichincha" and "pichincha" (Nombre/Slug placeholders) would
    // otherwise both match either locator.
    await page.getByPlaceholder('Pichincha', { exact: true }).fill(name)
    await page.getByPlaceholder('pichincha', { exact: true }).fill(slug)
    await page.getByRole('button', { name: 'Crear sucursal' }).click()

    const row = page.getByRole('row', { name: new RegExp(name) })
    await expect(row).toBeVisible()
    await expect(row.getByText(`/${slug}`)).toBeVisible()
    await expect(row.getByText('Activa')).toBeVisible()

    // Edit — the Pencil button has no text label, it's the first of the
    // two icon-only buttons in the row's last cell.
    await row.getByRole('button').first().click()
    const nameInput = page.getByPlaceholder('Pichincha', { exact: true })
    await nameInput.fill(renamedName)
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    const editedRow = page.getByRole('row', { name: new RegExp(renamedName.replace(/[()]/g, '\\$&')) })
    await expect(editedRow).toBeVisible()

    // Delete — confirm() dialog, second icon-only button (superadmin-only).
    page.once('dialog', (d) => d.accept())
    await editedRow.getByRole('button').nth(1).click()
    await expect(page.getByRole('row', { name: new RegExp(renamedName.replace(/[()]/g, '\\$&')) })).toHaveCount(0)
  } finally {
    // Safety net — if an assertion above threw before the UI delete step,
    // this still removes the throwaway branch instead of leaving it behind.
    const leftover = await getBranchBySlug(slug)
    if (leftover) await deleteBranchBySlug(slug)
  }
})
