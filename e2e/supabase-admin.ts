// Public project URL + anon key — same values shipped in the client bundle
// (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY), safe to hardcode here.
const SUPABASE_URL = 'https://ccmjlbkvafkwyvehktxt.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjbWpsYmt2YWZrd3l2ZWhrdHh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzQxNjcsImV4cCI6MjA5NjQ1MDE2N30.Ruryu1G_Oaoo-NoMvByOrrKL8Cos6ppYupALdHHipYY'

function requireServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY env var is required for this helper')
  return key
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
// correctly without needing a real MP purchase.
export async function insertRegistration(eventId: string, spots: number): Promise<string> {
  const res = await adminRequest('registrations', {
    method: 'POST', prefer: 'return=representation',
    body: { event_id: eventId, spots, email: 'e2e-spots-integrity@example.com' },
    action: 'insert registration',
  })
  const [row] = await res.json()
  return row.id
}

export async function deleteRegistration(id: string): Promise<void> {
  await adminRequest(`registrations?id=eq.${id}`, { method: 'DELETE', action: 'delete registration' })
}

export async function getCourseSpots(courseId: string): Promise<number> {
  const res = await anonRequest(`courses?id=eq.${courseId}&select=available_spots`, 'read course available_spots')
  const [row] = await res.json()
  return row.available_spots
}

export async function insertEnrollment(courseId: string): Promise<string> {
  const res = await adminRequest('enrollments', {
    method: 'POST', prefer: 'return=representation',
    body: { course_id: courseId, status: 'enrolled', email: 'e2e-spots-integrity@example.com' },
    action: 'insert enrollment',
  })
  const [row] = await res.json()
  return row.id
}

export async function deleteEnrollment(id: string): Promise<void> {
  await adminRequest(`enrollments?id=eq.${id}`, { method: 'DELETE', action: 'delete enrollment' })
}

// Cleanup after a real (sandbox) purchase flow — deletes by course/email
// instead of by id since the id is generated server-side by the edge
// function, not returned to the test.
export async function deleteEnrollmentsByEmail(courseId: string, email: string): Promise<void> {
  await adminRequest(`enrollments?course_id=eq.${courseId}&email=eq.${encodeURIComponent(email)}`, {
    method: 'DELETE', action: 'delete enrollments by email',
  })
}

// subscriptions has no email column (guest checkout has no user_id either),
// so cleanup targets the most recently created row for the plan instead —
// safe as long as tests in this plan aren't run concurrently.
export async function deleteLatestSubscription(planId: string): Promise<void> {
  const findRes = await adminRequest(`subscriptions?plan_id=eq.${planId}&select=id&order=created_at.desc&limit=1`, {
    action: 'find subscription to delete',
  })
  const [row] = await findRes.json()
  if (!row) return
  await adminRequest(`subscriptions?id=eq.${row.id}`, { method: 'DELETE', action: 'delete subscription' })
}

// --- Scanner test helpers ---
// Mirrors the exact reads/writes AdminScanner.tsx's onScan() does against
// `tickets`, so the single-use validation rule can be tested without a real
// camera + rendered QR code (browser test environments have neither).

export async function insertTicket(eventId: string, registrationId: string): Promise<{ id: string; token: string }> {
  const res = await adminRequest('tickets', {
    method: 'POST', prefer: 'return=representation',
    body: { event_id: eventId, registration_id: registrationId },
    action: 'insert ticket',
  })
  const [row] = await res.json()
  return { id: row.id, token: row.token }
}

export async function getTicketByToken(token: string, eventId: string): Promise<{ id: string; validated_at: string | null } | null> {
  const res = await adminRequest(`tickets?token=eq.${token}&event_id=eq.${eventId}&select=id,validated_at`, {
    action: 'read ticket',
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

export async function deleteTicketAndRegistration(ticketId: string, registrationId: string): Promise<void> {
  await adminRequest(`tickets?id=eq.${ticketId}`, { method: 'DELETE', action: 'delete ticket' })
  await adminRequest(`registrations?id=eq.${registrationId}`, { method: 'DELETE', action: 'delete registration' })
}
