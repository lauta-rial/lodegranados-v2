import { test, expect, type Page } from '@playwright/test'

// Fully automated — no MP, no manual card entry. Verifies the `host` role
// (Fase 4): a host's admin surface is limited to the events assigned to
// them via `event_hosts` — no Sidebar, no other admin pages, no visibility
// into other events' tickets/session state. See memory: qr-ticket-scanning
// for the full RLS design; register-e2e-testing for how test accounts are
// created (registered normally, then role/branch_id set in app_metadata).
//
// HOST_TEST is a real, permanent test fixture (like PICHINCHA_ADMIN/
// CENTRO_ADMIN): created via the Staff CRUD, assigned to the real seeded
// "Cata de Malbec Mendocino" event — not torn down after the run, reused
// across runs like the other test admin accounts.
const HOST_TEST = { email: 'whatsapp.assistance.v1+hosttest@gmail.com', password: 'TestResend123!' }
const ASSIGNED_EVENT_ID = '09e0bd67-0667-497d-a055-a0169817a207' // Cata de Malbec Mendocino
const UNASSIGNED_EVENT_ID = '9d0428a4-f870-46cd-8e8c-fe9576f3862a' // Cata Vertical — Cabernet Sauvignon

async function loginHost(page: Page) {
  await page.context().clearCookies()
  await page.goto('/admin')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/admin')
  await page.locator('input[type="email"]').fill(HOST_TEST.email)
  await page.locator('input[type="password"]').fill(HOST_TEST.password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByText(`Host — ${HOST_TEST.email}`)).toBeVisible()
}

test.describe('host role', () => {
  test('a host only sees their assigned event, and no admin Sidebar/other pages', async ({ page }) => {
    await loginHost(page)

    // Own event: visible, links to its live page.
    const eventLink = page.getByRole('link', { name: /Cata de Malbec Mendocino/ })
    await expect(eventLink).toBeVisible()
    await expect(eventLink).toHaveAttribute('href', `/admin/catas/${ASSIGNED_EVENT_ID}/live`)

    // No full admin shell — none of the regular nav links exist for a host.
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Sucursales' })).toHaveCount(0)

    // Direct URL to a real admin-only page bounces back to the host's own
    // landing instead of the real page (AdminLayout gates on role === 'host'
    // before the route even resolves).
    await page.goto('/admin/staff')
    await expect(page.getByText(`Host — ${HOST_TEST.email}`)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Staff' })).toHaveCount(0)

    await page.goto('/admin/catas')
    await expect(page.getByText(`Host — ${HOST_TEST.email}`)).toBeVisible()

    // Their assigned event's live page works normally.
    await eventLink.click()
    await expect(page).toHaveURL(new RegExp(`/admin/catas/${ASSIGNED_EVENT_ID}/live$`))
    await expect(page.getByText('Cata de Malbec Mendocino')).toBeVisible()
  })

  test('a host cannot modify session state or read tickets for an event they are not assigned to (RLS)', async ({ page }) => {
    await loginHost(page)

    const accessToken = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.endsWith('-auth-token'))
      if (!key) return null
      const parsed = JSON.parse(localStorage.getItem(key) ?? '{}')
      return parsed?.access_token ?? null
    })
    expect(accessToken).toBeTruthy()

    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjbWpsYmt2YWZrd3l2ZWhrdHh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzQxNjcsImV4cCI6MjA5NjQ1MDE2N30.Ruryu1G_Oaoo-NoMvByOrrKL8Cos6ppYupALdHHipYY'
    const headers = {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }

    // Not assigned to this event — a no-op update (RLS filters it to zero
    // rows) and zero visible tickets, even though the event itself has real
    // registrations/tickets (unlike the assigned one, which has none).
    const patchRes = await page.request.patch(
      `https://ccmjlbkvafkwyvehktxt.supabase.co/rest/v1/event_sessions?event_id=eq.${UNASSIGNED_EVENT_ID}`,
      { headers, data: { started_at: '2026-01-01T00:00:00Z' } }
    )
    expect(patchRes.ok()).toBeTruthy()
    expect(await patchRes.json()).toHaveLength(0)

    const ticketsRes = await page.request.get(
      `https://ccmjlbkvafkwyvehktxt.supabase.co/rest/v1/tickets?event_id=eq.${UNASSIGNED_EVENT_ID}&select=id`,
      { headers }
    )
    expect(ticketsRes.ok()).toBeTruthy()
    expect(await ticketsRes.json()).toHaveLength(0)

    // Assigned event: the same PATCH actually goes through — confirms the
    // block above is RLS working as designed, not some unrelated failure.
    const ownPatchRes = await page.request.patch(
      `https://ccmjlbkvafkwyvehktxt.supabase.co/rest/v1/event_sessions?event_id=eq.${ASSIGNED_EVENT_ID}`,
      { headers, data: { started_at: null } }
    )
    expect(ownPatchRes.ok()).toBeTruthy()
    expect(await ownPatchRes.json()).toHaveLength(1)
  })
})
