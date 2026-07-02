import { test, expect, type Page } from '@playwright/test'

// Fully automated — no MP, no manual card entry. Verifies branch scoping
// across the whole admin panel: a branch admin should only ever see their
// own branch's data, and only a superadmin sees everything + the
// "Sucursal" column. See memory: register-e2e-testing for how these test
// admin accounts were created (registered normally, then role/branch_id
// set directly in app_metadata via SQL — same as the real admin accounts).
const SUPERADMIN = { email: 'whatsapp.assistance@gmail.com', password: 'Admin1234!' }
const PICHINCHA_ADMIN = { email: 'whatsapp.assistance.v1+pichinchaadmin@gmail.com', password: 'TestResend123!' }
const CENTRO_ADMIN = { email: 'whatsapp.assistance.v1+centroadmin@gmail.com', password: 'TestResend123!' }

// Pichincha has real seeded data (events/courses/plans); Centro has none —
// that asymmetry is what makes "does isolation actually hold" checkable.
const KNOWN_PICHINCHA_EVENT_ID = '09e0bd67-0667-497d-a055-a0169817a207' // Cata de Malbec Mendocino

async function loginAdmin(page: Page, creds: { email: string; password: string }) {
  await page.context().clearCookies()
  await page.goto('/admin')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/admin')
  await page.locator('input[type="email"]').fill(creds.email)
  await page.locator('input[type="password"]').fill(creds.password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
}

test.describe('admin branch scoping', () => {
  test('branch admin sees only their branch across catas/cursos/club, superadmin sees all', async ({ page }) => {
    // --- Pichincha admin: has real data, should see it, scoped to their branch ---
    await loginAdmin(page, PICHINCHA_ADMIN)
    await expect(page.getByText('Resumen de tu sucursal')).toBeVisible()

    await page.goto('/admin/catas')
    await expect(page.getByRole('cell', { name: 'Cata de Malbec Mendocino' })).toBeVisible()
    // Branch admins never see the "Sucursal" column — it's redundant (always their own)
    await expect(page.getByRole('columnheader', { name: 'Sucursal' })).toHaveCount(0)

    await page.goto('/admin/cursos')
    await expect(page.getByRole('cell', { name: 'Introducción al Mundo del Vino' })).toBeVisible()

    await page.goto('/admin/club')
    await expect(page.getByText('Esencial')).toBeVisible()

    // --- Centro admin: same panel, zero data — must NOT see Pichincha's rows ---
    await loginAdmin(page, CENTRO_ADMIN)
    await expect(page.getByText('Resumen de tu sucursal')).toBeVisible()

    await page.goto('/admin/catas')
    await expect(page.getByText('No hay eventos')).toBeVisible()
    await expect(page.getByText('Cata de Malbec Mendocino')).toHaveCount(0)

    await page.goto('/admin/cursos')
    await expect(page.getByText('No hay cursos')).toBeVisible()
    await expect(page.getByText('Introducción al Mundo del Vino')).toHaveCount(0)

    // --- Superadmin: sees everything, plus the Sucursal column ---
    await loginAdmin(page, SUPERADMIN)
    await expect(page.getByText('Resumen global')).toBeVisible()

    await page.goto('/admin/catas')
    await expect(page.getByRole('columnheader', { name: 'Sucursal' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Cata de Malbec Mendocino' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Pichincha', exact: true }).first()).toBeVisible()
  })

  test('Sucursales/Newsletter: hidden in sidebar and blocked by direct URL for branch admins', async ({ page }) => {
    await loginAdmin(page, PICHINCHA_ADMIN)
    await expect(page.getByRole('link', { name: 'Sucursales' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Newsletter' })).toHaveCount(0)

    await page.goto('/admin/sucursales')
    await expect(page).toHaveURL(/\/admin$/)

    await page.goto('/admin/newsletter')
    await expect(page).toHaveURL(/\/admin$/)

    // Superadmin: both are reachable
    await loginAdmin(page, SUPERADMIN)
    await expect(page.getByRole('link', { name: 'Sucursales' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Newsletter' })).toBeVisible()
    await page.goto('/admin/sucursales')
    await expect(page).toHaveURL(/\/admin\/sucursales$/)
  })

  test('branch admin cannot write to another branch\'s event via the API (RLS)', async ({ page }) => {
    await loginAdmin(page, CENTRO_ADMIN)

    // Pull the Centro admin's own access token out of the Supabase client's
    // localStorage session — same token the app itself uses for every request.
    const accessToken = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.endsWith('-auth-token'))
      if (!key) return null
      const parsed = JSON.parse(localStorage.getItem(key) ?? '{}')
      return parsed?.access_token ?? null
    })
    expect(accessToken).toBeTruthy()

    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjbWpsYmt2YWZrd3l2ZWhrdHh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzQxNjcsImV4cCI6MjA5NjQ1MDE2N30.Ruryu1G_Oaoo-NoMvByOrrKL8Cos6ppYupALdHHipYY'

    // Same-value "update" — harmless even if RLS is broken and it goes through,
    // no cleanup needed either way.
    const res = await page.request.patch(
      `https://ccmjlbkvafkwyvehktxt.supabase.co/rest/v1/events?id=eq.${KNOWN_PICHINCHA_EVENT_ID}`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        data: { title: 'Cata de Malbec Mendocino' },
      }
    )
    expect(res.ok()).toBeTruthy()
    const rows = await res.json()
    // RLS should filter this to zero affected rows — a Centro admin has no
    // business touching a Pichincha event, even with a no-op update.
    expect(rows).toHaveLength(0)
  })
})
