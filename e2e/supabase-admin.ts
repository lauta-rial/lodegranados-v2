// Public project URL + anon key — same values shipped in the client bundle
// (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY), safe to hardcode here.
// Exported because scanner.spec.ts, admin-access-control.spec.ts, and
// host-role.spec.ts had each already copy-pasted this same literal
// independently — payment-security.spec.ts is the reason this finally got
// pulled out instead of becoming a 4th copy. The other 3 aren't migrated to
// the import in this pass (out of scope), just not making it worse.
export const SUPABASE_URL = 'https://ccmjlbkvafkwyvehktxt.supabase.co'
export const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjbWpsYmt2YWZrd3l2ZWhrdHh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzQxNjcsImV4cCI6MjA5NjQ1MDE2N30.Ruryu1G_Oaoo-NoMvByOrrKL8Cos6ppYupALdHHipYY'

function requireServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY env var is required for this helper')
  return key
}

// GoTrue's admin "list users" endpoint doesn't support filtering by email
// server-side the way this needs (confirmed: it 500s) — same underlying
// issue as the listUsers() pagination bug find_user_by_email was built to
// route around (see migration add_find_user_by_email_rpc, used by
// manage-staff). Reused here for the same reason: it's a direct SQL lookup
// against auth.users, service-role only. Used to clean up the disposable
// account register-confirm-welcome.spec.ts creates every run (it has to
// register a fresh one each time, unlike the purchase-*.spec.ts files,
// which all share one persistent CHECKOUT_TEST account precisely to avoid
// this kind of pileup — see purchase-helpers.ts).
export async function deleteUserByEmail(email: string): Promise<void> {
  const key = requireServiceRoleKey()
  const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/find_user_by_email`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_email: email }),
  })
  if (!rpcRes.ok) throw new Error(`Failed to look up user by email: ${rpcRes.status} ${await rpcRes.text()}`)
  const rows = await rpcRes.json()
  const user = rows?.[0]
  if (!user) return
  const delRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (!delRes.ok) throw new Error(`Failed to delete user: ${delRes.status} ${await delRes.text()}`)
}

// Same lookup as deleteUserByEmail's, without the delete — mi-cuenta.spec.ts
// needs CHECKOUT_TEST's real auth.users id to seed a registration/enrollment
// that will actually show up in ITS OWN MiCuenta (queried by user_id).
export async function getUserIdByEmail(email: string): Promise<string | null> {
  const key = requireServiceRoleKey()
  const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/find_user_by_email`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_email: email }),
  })
  if (!rpcRes.ok) throw new Error(`Failed to look up user by email: ${rpcRes.status} ${await rpcRes.text()}`)
  const rows = await rpcRes.json()
  return rows?.[0]?.id ?? null
}

// Every REST helper below goes through this — one place for the
// apikey/Authorization headers, the fetch call, and the error-on-non-ok
// check, instead of each function repeating its own copy (which had already
// drifted into inconsistent error messages across call sites).
async function restRequest(
  path: string,
  opts: { method?: string; apiKey: string; body?: unknown; prefer?: string; action: string }
): Promise<Response> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      apikey: opts.apiKey,
      Authorization: `Bearer ${opts.apiKey}`,
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.prefer ? { Prefer: opts.prefer } : {}),
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  })
  if (!res.ok) throw new Error(`Failed to ${opts.action}: ${res.status} ${await res.text()}`)
  return res
}

const anonRequest = (path: string, action: string) => restRequest(path, { apiKey: ANON_KEY, action })
const adminRequest = (path: string, opts: Omit<Parameters<typeof restRequest>[1], 'apiKey'>) =>
  restRequest(path, { ...opts, apiKey: requireServiceRoleKey() })

export async function getAvailableSpots(eventId: string): Promise<number> {
  const res = await anonRequest(`events?id=eq.${eventId}&select=available_spots`, 'read available_spots')
  const [row] = await res.json()
  return row.available_spots
}

// Writing available_spots is admin-only (RLS), so this needs the service role
// key — pass it as SUPABASE_SERVICE_ROLE_KEY. Without it, resetting is skipped
// (not a hard failure) and must be done manually via SQL afterward.
export async function setAvailableSpots(eventId: string, spots: number): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(`SUPABASE_SERVICE_ROLE_KEY not set — available_spots for event ${eventId} was NOT reset. Reset manually to ${spots} if needed.`)
    return
  }
  await adminRequest(`events?id=eq.${eventId}`, {
    method: 'PATCH', prefer: 'return=minimal', body: { available_spots: spots }, action: 'reset available_spots',
  })
}

// `registrations` rows are only readable by the owner or an admin (RLS), so
// this needs the service role key too. Returns null (skip, don't fail) when
// the key isn't provided.
export async function getRegistrationsCount(eventId: string): Promise<number | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  const res = await adminRequest(`registrations?event_id=eq.${eventId}&select=id`, {
    prefer: 'count=exact', action: 'read registrations count',
  })
  const range = res.headers.get('content-range') // "0-4/5"
  return range ? parseInt(range.split('/')[1], 10) : (await res.json()).length
}

// Direct writes to registrations/tickets-adjacent tables, bypassing the app
// entirely — used to test that the DB triggers recalculate available_spots
// correctly without needing a real MP purchase. Optional userId lets
// mi-cuenta.spec.ts seed a row that actually shows up in a real user's
// MiCuenta (queried by user_id there, not by this hardcoded email).
export async function insertRegistration(eventId: string, spots: number, userId?: string): Promise<string> {
  const res = await adminRequest('registrations', {
    method: 'POST', prefer: 'return=representation',
    body: { event_id: eventId, spots, email: 'e2e-spots-integrity@example.com', ...(userId ? { user_id: userId } : {}) },
    action: 'insert registration',
  })
  const [row] = await res.json()
  return row.id
}

export async function deleteRegistration(id: string): Promise<void> {
  await adminRequest(`registrations?id=eq.${id}`, { method: 'DELETE', action: 'delete registration' })
}

// Cursos are events with kind='curso' now (registrations absorbed
// enrollments, events absorbed courses) — this is the same table/column
// getAvailableSpots reads, kept as a distinctly-named alias since callers
// read more clearly as "course spots" at their call sites.
export async function getCourseSpots(courseId: string): Promise<number> {
  return getAvailableSpots(courseId)
}

export async function insertEnrollment(courseId: string, userId?: string): Promise<string> {
  const res = await adminRequest('registrations', {
    method: 'POST', prefer: 'return=representation',
    body: { event_id: courseId, spots: 1, status: 'enrolled', email: 'e2e-spots-integrity@example.com', ...(userId ? { user_id: userId } : {}) },
    action: 'insert enrollment',
  })
  const [row] = await res.json()
  return row.id
}

export async function deleteEnrollment(id: string): Promise<void> {
  await adminRequest(`registrations?id=eq.${id}`, { method: 'DELETE', action: 'delete enrollment' })
}

// Cleanup after a real (sandbox) purchase flow — deletes by course/email
// instead of by id since the id is generated server-side by the edge
// function, not returned to the test.
export async function deleteEnrollmentsByEmail(courseId: string, email: string): Promise<void> {
  await adminRequest(`registrations?event_id=eq.${courseId}&email=eq.${encodeURIComponent(email)}`, {
    method: 'DELETE', action: 'delete enrollments by email',
  })
}

// Regression coverage for the recalculate_event_spots rewrite (Phase 2): a
// registration with status='dropped' must NOT count against available_spots
// — mirrors what recalculate_course_spots used to guarantee for enrollments
// before it was retired in favor of one unified function.
export async function updateRegistrationStatus(id: string, status: string): Promise<void> {
  await adminRequest(`registrations?id=eq.${id}`, {
    method: 'PATCH', prefer: 'return=minimal', body: { status }, action: 'update registration status',
  })
}

// Cleanup targets the most recently created row for the plan — safe as
// long as tests against this plan aren't run concurrently.
export async function deleteLatestSubscription(planId: string): Promise<void> {
  const findRes = await adminRequest(`subscriptions?plan_id=eq.${planId}&select=id&order=created_at.desc&limit=1`, {
    action: 'find subscription to delete',
  })
  const [row] = await findRes.json()
  if (!row) return
  await adminRequest(`subscriptions?id=eq.${row.id}`, { method: 'DELETE', action: 'delete subscription' })
}

// Real recurring-billing subscriptions (see project_audit_2026-07-04) are
// keyed by preapproval_id, not plan_id/payment_id — used to confirm a
// fabricated preapproval_id created no row at all, not just to clean up.
export async function getSubscriptionByPreapprovalId(preapprovalId: string): Promise<{ id: string } | null> {
  const res = await adminRequest(`subscriptions?preapproval_id=eq.${preapprovalId}&select=id`, {
    action: 'read subscription by preapproval_id',
  })
  const [row] = await res.json()
  return row ?? null
}

// --- Scanner test helpers ---
// Mirrors the exact reads/writes AdminEventLive.tsx's onScan() does against
// `tickets`, so the single-use validation rule can be tested without a real
// camera + rendered QR code (browser test environments have neither).
//
// Tickets are no longer inserted directly in tests (or in the app) — a DB
// trigger on `registrations` auto-creates `spots` tickets per existing
// session as soon as insertRegistration() runs (see migration
// per_session_tickets_and_session_lifecycle), each correctly stamped with
// session_id. Use getTicketsForRegistration() to read what the trigger
// already made instead of inserting a redundant extra one by hand.

export async function getTicketsForRegistration(registrationId: string): Promise<{ id: string; token: string }[]> {
  const res = await adminRequest(`tickets?registration_id=eq.${registrationId}&select=id,token&order=created_at.asc`, {
    action: 'read tickets for registration',
  })
  return res.json()
}

// A cata always has exactly one session (session_number=1), auto-created
// and kept in sync with the event's own date/time/location — this resolves
// its id for tests that need to assert session-scoped behavior.
export async function getFirstSessionId(eventId: string): Promise<string> {
  const res = await adminRequest(`event_sessions?event_id=eq.${eventId}&session_number=eq.1&select=id`, {
    action: 'read first session id',
  })
  const [row] = await res.json()
  return row.id
}

export async function getTicketByToken(token: string, eventId: string): Promise<{ id: string; validated_at: string | null } | null> {
  const res = await adminRequest(`tickets?token=eq.${token}&event_id=eq.${eventId}&select=id,validated_at`, {
    action: 'read ticket',
  })
  const [row] = await res.json()
  return row ?? null
}

// Mirrors onScan()'s actual lookup — token + session_id, not event_id. Used
// to prove a ticket scanned against the wrong session doesn't match, the
// real guard against a class-3 ticket validating during class-1's live
// window (or, for catas, a ticket from a different event entirely).
export async function getTicketBySessionId(token: string, sessionId: string): Promise<{ id: string; validated_at: string | null } | null> {
  const res = await adminRequest(`tickets?token=eq.${token}&session_id=eq.${sessionId}&select=id,validated_at`, {
    action: 'read ticket by session',
  })
  const [row] = await res.json()
  return row ?? null
}

export async function validateTicket(token: string): Promise<void> {
  await adminRequest(`tickets?token=eq.${token}`, {
    method: 'PATCH', prefer: 'return=minimal',
    body: { validated_at: new Date().toISOString() },
    action: 'validate ticket',
  })
}

// Mirrors AdminEventLive.tsx's onScan() including the `validated_at IS NULL`
// guard that closes the two-scanners-same-ticket race: the UPDATE only
// matches a row if nobody validated it in between. Empty array means "lost
// the race" (or it was already validated) — never throws on that, since it's
// an expected outcome for one side of a concurrent scan, not a failure.
export async function validateTicketIfUnvalidated(token: string): Promise<{ id: string }[]> {
  const res = await adminRequest(`tickets?token=eq.${token}&validated_at=is.null`, {
    method: 'PATCH', prefer: 'return=representation',
    body: { validated_at: new Date().toISOString() },
    action: 'conditionally validate ticket',
  })
  return res.json()
}

// Inserts a ticket with an explicit token instead of letting the DB default
// (gen_random_uuid()) generate one. Returns the raw Response instead of
// throwing on a non-2xx — used to prove tickets_token_key (UNIQUE) rejects a
// collision, where the 409 *is* the expected outcome being asserted on.
export async function tryInsertTicketWithToken(eventId: string, registrationId: string, token: string): Promise<Response> {
  const serviceRoleKey = requireServiceRoleKey()
  return fetch(`${SUPABASE_URL}/rest/v1/tickets`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ event_id: eventId, registration_id: registrationId, token }),
  })
}

export async function deleteTicketAndRegistration(ticketId: string, registrationId: string): Promise<void> {
  await adminRequest(`tickets?id=eq.${ticketId}`, { method: 'DELETE', action: 'delete ticket' })
  await adminRequest(`registrations?id=eq.${registrationId}`, { method: 'DELETE', action: 'delete registration' })
}

// The live-page lifecycle tests flip started_at/ended_at on a session of a
// real, permanent production event (EVENT_ID in scanner.spec.ts) instead of
// a throwaway test row — this resets its first session back to "not
// started" regardless of which lifecycle state a test left it in. A cata
// only ever has one session (session_number=1), so this doesn't need to
// know which session id that is.
export async function resetEventLifecycle(eventId: string): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(`SUPABASE_SERVICE_ROLE_KEY not set — lifecycle for event ${eventId} was NOT reset.`)
    return
  }
  await adminRequest(`event_sessions?event_id=eq.${eventId}&session_number=eq.1`, {
    method: 'PATCH', prefer: 'return=minimal', body: { started_at: null, ended_at: null }, action: 'reset event lifecycle',
  })
}

// --- Payment security test helpers ---
// Calls an edge function directly with a given API key — used to exercise
// send-email/create-mp-preference as an attacker would (anon key only, no
// real MercadoPago payment), independent of whatever a real UI checkout
// would normally send.
export async function callEdgeFunction(name: string, body: unknown, apiKey: string = ANON_KEY): Promise<Response> {
  return fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Same idea, for a SECURITY DEFINER function exposed via PostgREST RPC
// (e.g. backfill_tickets_for_registration) — lets a test call it with a
// specific role's key instead of whatever role the ambient client uses.
export async function callRpc(name: string, body: unknown, apiKey: string = ANON_KEY): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function getLatestPendingCheckout(ref: string): Promise<{ id: string; price: number; spots: number } | null> {
  const res = await adminRequest(`pending_checkouts?ref=eq.${ref}&select=id,price,spots&order=created_at.desc&limit=1`, {
    action: 'read latest pending_checkout',
  })
  const [row] = await res.json()
  return row ?? null
}

export async function deletePendingCheckout(id: string): Promise<void> {
  await adminRequest(`pending_checkouts?id=eq.${id}`, { method: 'DELETE', action: 'delete pending_checkout' })
}

export async function getEventPrice(eventId: string): Promise<number> {
  const res = await anonRequest(`events?id=eq.${eventId}&select=price`, 'read event price')
  const [row] = await res.json()
  return row.price
}

export async function getRegistrationByEmail(eventId: string, email: string): Promise<{ id: string } | null> {
  const res = await adminRequest(`registrations?event_id=eq.${eventId}&email=eq.${encodeURIComponent(email)}&select=id`, {
    action: 'read registration by email',
  })
  const [row] = await res.json()
  return row ?? null
}

// --- Empresas / Newsletter / Sucursales / assign-host coverage helpers ---

export async function getLatestInquiryByEmail(email: string): Promise<{ id: string } | null> {
  const res = await adminRequest(`inquiries?email=eq.${encodeURIComponent(email)}&select=id&order=created_at.desc&limit=1`, {
    action: 'read latest inquiry by email',
  })
  const [row] = await res.json()
  return row ?? null
}

export async function deleteInquiry(id: string): Promise<void> {
  await adminRequest(`inquiries?id=eq.${id}`, { method: 'DELETE', action: 'delete inquiry' })
}

// Safety-net cleanup — the UI-driven delete in admin-newsletter-crud.spec.ts
// and public-pages.spec.ts's newsletter signup test should already remove
// their own rows, but a test failing mid-way would otherwise leave a
// throwaway subscriber behind indefinitely.
export async function deleteNewsletterSubscriberByEmail(email: string): Promise<void> {
  await adminRequest(`newsletter?email=eq.${encodeURIComponent(email)}`, { method: 'DELETE', action: 'delete newsletter subscriber' })
}

export async function getEventHostsForEvent(eventId: string): Promise<{ user_id: string }[]> {
  const res = await adminRequest(`event_hosts?event_id=eq.${eventId}&select=user_id`, {
    action: 'read event_hosts for event',
  })
  return res.json()
}

// admin-staff-crud.spec.ts assigns HOST_TEST to host-role.spec.ts's
// UNASSIGNED_EVENT_ID to exercise assign-host, then must undo it with this —
// host-role.spec.ts's RLS-negative-check depends on that event staying
// genuinely unassigned for other test runs.
export async function deleteEventHost(eventId: string, userId: string): Promise<void> {
  await adminRequest(`event_hosts?event_id=eq.${eventId}&user_id=eq.${userId}`, { method: 'DELETE', action: 'delete event_hosts row' })
}

export async function getBranchBySlug(slug: string): Promise<{ id: string } | null> {
  const res = await adminRequest(`branches?slug=eq.${encodeURIComponent(slug)}&select=id`, {
    action: 'read branch by slug',
  })
  const [row] = await res.json()
  return row ?? null
}

// Safety-net cleanup for admin-sucursales-crud.spec.ts — the test deletes
// its own throwaway branch through the UI, but a failure mid-test (e.g. the
// edit step throwing before delete runs) would otherwise leave it behind.
export async function deleteBranchBySlug(slug: string): Promise<void> {
  await adminRequest(`branches?slug=eq.${encodeURIComponent(slug)}`, { method: 'DELETE', action: 'delete branch by slug' })
}

// --- Club redemption (canjes) helpers ---

export async function getActiveSubscription(): Promise<{ id: string; redeem_token: string } | null> {
  const res = await adminRequest('subscriptions?status=eq.active&select=id,redeem_token&limit=1', {
    action: 'read an active subscription',
  })
  const [row] = await res.json()
  return row ?? null
}

// Raw Response (not thrown-on-error) so callers can assert on the outcome: a
// 409 for a duplicate (subscription_id, period), or an RLS-filtered empty body
// when a non-admin token is used. `token` is the Authorization bearer — the
// service role key for admin inserts, or a user's access token for the RLS case.
export async function insertClubRedemption(subscriptionId: string, period: string, token: string): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/club_redemptions`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ subscription_id: subscriptionId, period }),
  })
}

export async function deleteClubRedemptions(subscriptionId: string, period: string): Promise<void> {
  await adminRequest(`club_redemptions?subscription_id=eq.${subscriptionId}&period=eq.${period}`, {
    method: 'DELETE', action: 'delete club redemptions',
  })
}

export function serviceRoleKey(): string {
  return requireServiceRoleKey()
}

// --- Attendance helpers ---

export async function getRegistrationAttended(id: string): Promise<boolean | null> {
  const res = await adminRequest(`registrations?id=eq.${id}&select=attended`, {
    action: 'read registration attended',
  })
  const [row] = await res.json()
  return row?.attended ?? null
}

// Direct GoTrue password-grant — returns a user's access token without driving
// the UI, for API-level RLS/trigger assertions (mirrors what the app's client
// stores in localStorage after a login).
export async function getAccessToken(email: string, password: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`login failed for ${email}: ${res.status} ${await res.text()}`)
  return (await res.json()).access_token
}
