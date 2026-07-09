import { expect, type Page } from '@playwright/test'

// Pulled out of admin-access-control.spec.ts (where this was first written)
// so the new admin CRUD specs (Sucursales/Newsletter/Staff) can share it
// instead of each pasting their own copy — all of them need the exact same
// superadmin login, none of them need branch-scoping variants.
export const SUPERADMIN = { email: 'whatsapp.assistance.v1+superadmin@gmail.com', password: 'Admin1234!' }

export async function loginAdmin(page: Page, creds: { email: string; password: string }) {
  await page.context().clearCookies()
  await page.goto('/admin')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/admin')
  await page.locator('input[type="email"]').fill(creds.email)
  await page.locator('input[type="password"]').fill(creds.password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
}
