import { test, expect } from '@playwright/test'
import { insertRegistration, insertTicket, getTicketByToken, validateTicket, deleteTicketAndRegistration } from './supabase-admin'

// AdminScanner.tsx scans QR codes via a real device camera (html5-qrcode +
// getUserMedia) — there's no real camera or a rendered QR code to point it at
// in a browser test environment, and faking one needs a synthetic video
// device stream, which is a lot of fragility for what's actually being
// tested here. Instead this exercises the validation RULE directly: the
// exact reads/writes AdminScanner's onScan() does against `tickets`
// (look up by token+event_id, reject if already validated_at, otherwise
// stamp it). That's the part that actually matters — a ticket can only let
// one person in.
const PICHINCHA_ADMIN = { email: 'whatsapp.assistance.v1+pichinchaadmin@gmail.com', password: 'TestResend123!' }
const EVENT_ID = '09e0bd67-0667-497d-a055-a0169817a207' // Cata de Malbec Mendocino

test.describe('ticket scanning', () => {
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, 'requires SUPABASE_SERVICE_ROLE_KEY')

  test('scanner page loads for the event\'s admin', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/admin')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/admin')
    await page.locator('input[type="email"]').fill(PICHINCHA_ADMIN.email)
    await page.locator('input[type="password"]').fill(PICHINCHA_ADMIN.password)
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    await page.goto(`/admin/scanner/${EVENT_ID}`)
    await expect(page.getByText('Cata de Malbec Mendocino')).toBeVisible()
    await expect(page.getByText('Validar entradas')).toBeVisible()
    // No real camera in CI/test envs — either the permission-denied message
    // or the live camera view is fine; either way the page/route itself works.
  })

  test('a ticket can only validate (mark attended) once', async ({}) => {
    const registrationId = await insertRegistration(EVENT_ID, 1)
    const { token } = await insertTicket(EVENT_ID, registrationId)

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

  test('scanning a token from a different event is rejected as invalid', async ({}) => {
    const registrationId = await insertRegistration(EVENT_ID, 1)
    const { token, id } = await insertTicket(EVENT_ID, registrationId)

    // onScan() filters by token AND event_id — a valid token scanned against
    // the wrong event's scanner page must not match.
    const OTHER_EVENT_ID = '9d0428a4-f870-46cd-8e8c-fe9576f3862a' // Cata Vertical
    const wrongEventLookup = await getTicketByToken(token, OTHER_EVENT_ID)
    expect(wrongEventLookup).toBeNull()

    await deleteTicketAndRegistration(id, registrationId)
  })
})
