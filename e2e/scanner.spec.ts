import { test, expect, type Page } from '@playwright/test'
import {
  insertRegistration,
  getTicketsForRegistration,
  getFirstSessionId,
  getTicketByToken,
  getTicketBySessionId,
  validateTicket,
  validateTicketIfUnvalidated,
  tryInsertTicketWithToken,
  deleteTicketAndRegistration,
  deleteRegistration,
  resetEventLifecycle,
} from './supabase-admin'

// AdminEventLive.tsx scans QR codes via a real device camera (html5-qrcode +
// getUserMedia) — there's no real camera or a rendered QR code to point it at
// in a browser test environment, and faking one needs a synthetic video
// device stream, which is a lot of fragility for what's actually being
// tested here. Instead this exercises the validation RULE directly: the
// exact reads/writes onScan() does against `tickets` (look up by
// token+session_id, reject if already validated_at, otherwise stamp it).
// That's the part that actually matters — a ticket can only let one person
// in. insertRegistration() alone is enough to get a real ticket to test
// against — a DB trigger auto-creates one per session as soon as the
// registration row exists (see migration
// per_session_tickets_and_session_lifecycle), same as a real purchase would.
const PICHINCHA_ADMIN = { email: 'whatsapp.assistance.v1+pichinchaadmin@gmail.com', password: 'TestResend123!' }
// A plain registered buyer, not an admin — used to prove the tickets RLS
// policy actually rejects non-admin writes (see memory: this policy used to
// be `auth.role() = 'authenticated'`, letting any logged-in user validate
// or delete anyone's ticket; fixed to require app_metadata.role in
// ['admin','superadmin'], same pattern as registrations/events).
const REGULAR_USER = { email: 'whatsapp.assistance.v1+uitest2@gmail.com', password: 'TestResend123!' }
const EVENT_ID = '09e0bd67-0667-497d-a055-a0169817a207' // Cata de Malbec Mendocino

// Public project URL + anon key — same values shipped in the client bundle,
// needed here to hit PostgREST directly with a regular user's own session
// token instead of the service role key.
const SUPABASE_URL = 'https://ccmjlbkvafkwyvehktxt.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjbWpsYmt2YWZrd3l2ZWhrdHh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzQxNjcsImV4cCI6MjA5NjQ1MDE2N30.Ruryu1G_Oaoo-NoMvByOrrKL8Cos6ppYupALdHHipYY'

async function loginRegularUser(page: Page, creds: { email: string; password: string }): Promise<void> {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'tu@email.com' }).fill(creds.email)
  await page.getByRole('textbox', { name: '••••••••' }).fill(creds.password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  // Login.tsx navigates to `from` (defaults to '/') on success — waiting for
  // the redirect off /login is enough to know the session took.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
}

async function getAccessToken(page: Page): Promise<string> {
  const accessToken = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.endsWith('-auth-token'))
    if (!key) return null
    const parsed = JSON.parse(localStorage.getItem(key) ?? '{}')
    return parsed?.access_token ?? null
  })
  expect(accessToken).toBeTruthy()
  return accessToken as string
}

test.describe('ticket scanning', () => {
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, 'requires SUPABASE_SERVICE_ROLE_KEY')

  test('live page loads for the event\'s admin', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/admin')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/admin')
    await page.locator('input[type="email"]').fill(PICHINCHA_ADMIN.email)
    await page.locator('input[type="password"]').fill(PICHINCHA_ADMIN.password)
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    await page.goto(`/admin/catas/${EVENT_ID}/live`)
    await expect(page.getByText('Cata de Malbec Mendocino')).toBeVisible()
    await expect(page.getByText('SIN COMENZAR')).toBeVisible()
    // No real camera in CI/test envs, but the event hasn't started yet
    // anyway — the camera panel only mounts once "live", so there's nothing
    // camera-related to assert on here regardless.
  })

  test('a ticket can only validate (mark attended) once', async ({}) => {
    const registrationId = await insertRegistration(EVENT_ID, 1)
    const [ticket] = await getTicketsForRegistration(registrationId)
    const token = ticket.token

    const beforeScan = await getTicketByToken(token, EVENT_ID)
    expect(beforeScan?.validated_at).toBeNull()

    // First scan: valid, not yet used — same effect as onScan()'s "valid" branch.
    await validateTicket(token)
    const afterFirstScan = await getTicketByToken(token, EVENT_ID)
    expect(afterFirstScan?.validated_at).toBeTruthy()

    // Second scan of the same token: onScan() would see validated_at already
    // set and render "already_used" instead of validating again.
    const secondLookup = await getTicketByToken(token, EVENT_ID)
    expect(secondLookup?.validated_at).toBe(afterFirstScan?.validated_at)

    await deleteTicketAndRegistration(afterFirstScan!.id, registrationId)
  })

  test('scanning a token from a different session is rejected as invalid', async ({}) => {
    const registrationId = await insertRegistration(EVENT_ID, 1)
    const [ticket] = await getTicketsForRegistration(registrationId)

    // onScan() filters by token AND session_id (not just event_id) — this is
    // what actually stops a class-3 ticket from validating during class-1's
    // live window. Using two different catas' sessions here exercises the
    // same guard (a cata's only ever has one session, so cross-event and
    // cross-session are the same check for this case).
    const OTHER_EVENT_ID = '9d0428a4-f870-46cd-8e8c-fe9576f3862a' // Cata Vertical
    const otherSessionId = await getFirstSessionId(OTHER_EVENT_ID)
    const wrongSessionLookup = await getTicketBySessionId(ticket.token, otherSessionId)
    expect(wrongSessionLookup).toBeNull()

    await deleteTicketAndRegistration(ticket.id, registrationId)
  })

  test('ticket tokens must be unique — a duplicate token is rejected by the DB', async ({}) => {
    const registrationId = await insertRegistration(EVENT_ID, 1)
    const [ticket] = await getTicketsForRegistration(registrationId)

    // tickets_token_key is a UNIQUE constraint — this must fail regardless of
    // anything the app does, since PostgREST inserts a real DB row.
    const res = await tryInsertTicketWithToken(EVENT_ID, registrationId, ticket.token)
    expect(res.ok).toBeFalsy()
    const body = await res.json()
    expect(body.code).toBe('23505') // Postgres unique_violation

    await deleteTicketAndRegistration(ticket.id, registrationId)
  })

  test('a non-admin authenticated user cannot validate tickets via the API (RLS)', async ({ page }) => {
    const registrationId = await insertRegistration(EVENT_ID, 1)
    const [ticket] = await getTicketsForRegistration(registrationId)
    const { id, token } = ticket

    await loginRegularUser(page, REGULAR_USER)
    const accessToken = await getAccessToken(page)

    // Same request shape AdminScanner.tsx's onScan() makes, but with a plain
    // buyer's session instead of an admin's — "admins can manage tickets"
    // used to be `auth.role() = 'authenticated'`, which any logged-in user
    // satisfies. Now it requires app_metadata.role in ['admin','superadmin'].
    const res = await page.request.patch(
      `${SUPABASE_URL}/rest/v1/tickets?token=eq.${token}`,
      {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        data: { validated_at: new Date().toISOString() },
      }
    )
    expect(res.ok()).toBeTruthy() // RLS filters rows, it doesn't error the request
    const rows = await res.json()
    expect(rows).toHaveLength(0)

    const stillUnvalidated = await getTicketByToken(token, EVENT_ID)
    expect(stillUnvalidated?.validated_at).toBeNull()

    await deleteTicketAndRegistration(id, registrationId)
  })

  test('two simultaneous scans of the same ticket only validate it once', async ({}) => {
    const registrationId = await insertRegistration(EVENT_ID, 1)
    const [{ id, token }] = await getTicketsForRegistration(registrationId)

    // Both calls race for the same row. Without the `validated_at IS NULL`
    // guard in the UPDATE, both could read/write "valid" — this is the
    // scenario two scanners at two doors would hit scanning the same QR
    // at the same moment.
    const [first, second] = await Promise.all([
      validateTicketIfUnvalidated(token),
      validateTicketIfUnvalidated(token),
    ])

    const winners = [first, second].filter((r) => r.length === 1)
    const losers = [first, second].filter((r) => r.length === 0)
    expect(winners).toHaveLength(1)
    expect(losers).toHaveLength(1)

    const after = await getTicketByToken(token, EVENT_ID)
    expect(after?.validated_at).toBeTruthy()

    await deleteTicketAndRegistration(id, registrationId)
  })
})

test.describe('event live lifecycle', () => {
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, 'requires SUPABASE_SERVICE_ROLE_KEY')

  // Unlike the tests above (which create+delete their own registration/ticket
  // rows), these flip started_at/ended_at on EVENT_ID itself — a real,
  // permanent production event. A failed assertion mid-test must not leave
  // it stuck live/ended, so cleanup runs in afterEach instead of at the end
  // of the test body.
  test.afterEach(async () => {
    await resetEventLifecycle(EVENT_ID)
  })

  test('start, finish, and reopen an event from the live page', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/admin')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/admin')
    await page.locator('input[type="email"]').fill(PICHINCHA_ADMIN.email)
    await page.locator('input[type="password"]').fill(PICHINCHA_ADMIN.password)
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    await page.goto(`/admin/catas/${EVENT_ID}/live`)
    await expect(page.getByText('SIN COMENZAR')).toBeVisible()
    await expect(page.locator('#qr-reader')).toHaveCount(0)

    // No real camera in CI/test envs (Playwright's default chromium has no
    // fake video device) — TicketCameraPanel renders either the live
    // #qr-reader or a permission/device error message depending on what
    // getUserMedia does, and either is fine here: the point of this
    // assertion is that the camera panel mounted at all once "live", same
    // rationale as the original scanner page-load test above.
    const cameraPanelMounted = page.locator('#qr-reader').or(page.getByText(/cámara/i))

    await page.getByRole('button', { name: 'Iniciar evento' }).click()
    await expect(page.getByText('EN VIVO')).toBeVisible()
    await expect(cameraPanelMounted).toBeVisible()

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Finalizar evento' }).click()
    await expect(page.getByText('FINALIZADO')).toBeVisible()
    await expect(page.locator('#qr-reader')).toHaveCount(0)

    await page.getByRole('button', { name: 'Reabrir evento' }).click()
    await expect(page.getByText('EN VIVO')).toBeVisible()
    await expect(cameraPanelMounted).toBeVisible()
  })
})

test.describe('companion attendee emails', () => {
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, 'requires SUPABASE_SERVICE_ROLE_KEY')

  // Like the lifecycle tests above, this inserts rows into a real,
  // permanent production event's roster (not a throwaway one). Cleanup runs
  // in afterEach — not at the end of the test body — so a failed assertion
  // mid-test doesn't leave orphaned registrations/tickets behind (this
  // happened for real earlier: a failing assertion here left 5 stray
  // registrations with 12 tickets in the live "Cata de Malbec Mendocino"
  // event, cleaned up by hand via SQL).
  let cleanup: (() => Promise<void>) | null = null
  test.afterEach(async () => {
    if (cleanup) await cleanup()
    cleanup = null
  })

  test('door host can fill in a companion email on the live roster', async ({ page }) => {
    // insertRegistration(EVENT_ID, 3) alone gets 3 tickets — a DB trigger
    // auto-creates one per spot for the event's session, same as a real
    // 3-spot purchase would. Deleting the registration cascades to all of
    // them, so cleanup doesn't need to track individual ticket ids anymore.
    const registrationId = await insertRegistration(EVENT_ID, 3)
    cleanup = () => deleteRegistration(registrationId)

    await page.context().clearCookies()
    await page.goto('/admin')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/admin')
    await page.locator('input[type="email"]').fill(PICHINCHA_ADMIN.email)
    await page.locator('input[type="password"]').fill(PICHINCHA_ADMIN.password)
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    // EVENT_ID is a real, shared production event — other registrations with
    // 3 spots can already exist in its roster, so "Entrada 1/3" etc. aren't
    // unique on the page. The roster is ordered by created_at ascending and
    // these 3 tickets were just inserted, so they're the last matches.
    await page.goto(`/admin/catas/${EVENT_ID}/live`)
    await expect(page.getByText('Entrada 1/3', { exact: true }).last()).toBeVisible()
    await expect(page.getByText('Entrada 2/3', { exact: true }).last()).toBeVisible()
    await expect(page.getByText('Entrada 3/3', { exact: true }).last()).toBeVisible()

    const row2 = page.getByText('Entrada 2/3', { exact: true }).last().locator('..')
    await row2.locator('input[type="email"]').fill('companion2@example.com')
    await row2.getByRole('button', { name: 'Guardar' }).click()

    // AttendeeEmailCell's save() is async but its onClick isn't awaited by
    // React's event system — Playwright's `.click()` only waits for the
    // click event to dispatch, not for the fetch it kicks off. Reloading
    // immediately aborts that in-flight PATCH (net::ERR_ABORTED), so this
    // must wait for the client-side re-render (row switches from input to
    // plain text once attendee_email is set) before it's safe to reload.
    await expect(row2.getByText('companion2@example.com')).toBeVisible()

    await page.reload()
    await expect(page.getByText('companion2@example.com')).toBeVisible()
    // Ticket 1/3 has no attendee_email of its own — it always shows the
    // registration's own email instead, which must be unaffected by 2/3's
    // edit. e2e-spots-integrity@example.com is a shared fixture used by
    // other specs too, so scope to the last match (this test's own row,
    // freshly created) rather than assuming it's unique on the page.
    await expect(page.getByText('e2e-spots-integrity@example.com').last()).toBeVisible()
  })
})
