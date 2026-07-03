// Public project URL + anon key — same values shipped in the client bundle
// (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY), safe to hardcode here.
const SUPABASE_URL = 'https://ccmjlbkvafkwyvehktxt.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjbWpsYmt2YWZrd3l2ZWhrdHh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzQxNjcsImV4cCI6MjA5NjQ1MDE2N30.Ruryu1G_Oaoo-NoMvByOrrKL8Cos6ppYupALdHHipYY'

export async function getAvailableSpots(eventId: string): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.${eventId}&select=available_spots`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  })
  if (!res.ok) throw new Error(`Failed to read available_spots: ${res.status} ${await res.text()}`)
  const [row] = await res.json()
  return row.available_spots
}

// Writing available_spots is admin-only (RLS), so this needs the service role
// key — pass it as SUPABASE_SERVICE_ROLE_KEY. Without it, resetting is skipped
// (not a hard failure) and must be done manually via SQL afterward.
export async function setAvailableSpots(eventId: string, spots: number): Promise<void> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.warn(`SUPABASE_SERVICE_ROLE_KEY not set — available_spots for event ${eventId} was NOT reset. Reset manually to ${spots} if needed.`)
    return
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.${eventId}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ available_spots: spots }),
  })
  if (!res.ok) throw new Error(`Failed to reset available_spots: ${res.status} ${await res.text()}`)
}

// `registrations` rows are only readable by the owner or an admin (RLS), so
// this needs the service role key too. Returns null (skip, don't fail) when
// the key isn't provided.
export async function getRegistrationsCount(eventId: string): Promise<number | null> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return null
  const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations?event_id=eq.${eventId}&select=id`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'count=exact',
    },
  })
  if (!res.ok) throw new Error(`Failed to read registrations count: ${res.status} ${await res.text()}`)
  const range = res.headers.get('content-range') // "0-4/5"
  return range ? parseInt(range.split('/')[1], 10) : (await res.json()).length
}

function requireServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY env var is required for this helper')
  return key
}

// Direct writes to registrations/tickets-adjacent tables, bypassing the app
// entirely — used to test that the DB triggers recalculate available_spots
// correctly without needing a real MP purchase.
export async function insertRegistration(eventId: string, spots: number): Promise<string> {
  const serviceRoleKey = requireServiceRoleKey()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ event_id: eventId, spots, email: 'e2e-spots-integrity@example.com' }),
  })
  if (!res.ok) throw new Error(`Failed to insert registration: ${res.status} ${await res.text()}`)
  const [row] = await res.json()
  return row.id
}

export async function deleteRegistration(id: string): Promise<void> {
  const serviceRoleKey = requireServiceRoleKey()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations?id=eq.${id}`, {
    method: 'DELETE',
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  })
  if (!res.ok) throw new Error(`Failed to delete registration: ${res.status} ${await res.text()}`)
}

export async function getCourseSpots(courseId: string): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/courses?id=eq.${courseId}&select=available_spots`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  })
  if (!res.ok) throw new Error(`Failed to read course available_spots: ${res.status} ${await res.text()}`)
  const [row] = await res.json()
  return row.available_spots
}

export async function insertEnrollment(courseId: string): Promise<string> {
  const serviceRoleKey = requireServiceRoleKey()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/enrollments`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ course_id: courseId, status: 'enrolled', email: 'e2e-spots-integrity@example.com' }),
  })
  if (!res.ok) throw new Error(`Failed to insert enrollment: ${res.status} ${await res.text()}`)
  const [row] = await res.json()
  return row.id
}

export async function deleteEnrollment(id: string): Promise<void> {
  const serviceRoleKey = requireServiceRoleKey()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/enrollments?id=eq.${id}`, {
    method: 'DELETE',
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  })
  if (!res.ok) throw new Error(`Failed to delete enrollment: ${res.status} ${await res.text()}`)
}

// Cleanup after a real (sandbox) purchase flow — deletes by course/email
// instead of by id since the id is generated server-side by the edge
// function, not returned to the test.
export async function deleteEnrollmentsByEmail(courseId: string, email: string): Promise<void> {
  const serviceRoleKey = requireServiceRoleKey()
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/enrollments?course_id=eq.${courseId}&email=eq.${encodeURIComponent(email)}`,
    { method: 'DELETE', headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } }
  )
  if (!res.ok) throw new Error(`Failed to delete enrollments by email: ${res.status} ${await res.text()}`)
}

export async function deleteRegistrationsByEmail(eventId: string, email: string): Promise<void> {
  const serviceRoleKey = requireServiceRoleKey()
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/registrations?event_id=eq.${eventId}&email=eq.${encodeURIComponent(email)}`,
    { method: 'DELETE', headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } }
  )
  if (!res.ok) throw new Error(`Failed to delete registrations by email: ${res.status} ${await res.text()}`)
}

// subscriptions has no email column (guest checkout has no user_id either),
// so cleanup targets the most recently created row for the plan instead —
// safe as long as tests in this plan aren't run concurrently.
export async function deleteLatestSubscription(planId: string): Promise<void> {
  const serviceRoleKey = requireServiceRoleKey()
  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` }
  const findRes = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?plan_id=eq.${planId}&select=id&order=created_at.desc&limit=1`,
    { headers }
  )
  if (!findRes.ok) throw new Error(`Failed to find subscription to delete: ${findRes.status} ${await findRes.text()}`)
  const [row] = await findRes.json()
  if (!row) return
  const delRes = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?id=eq.${row.id}`, { method: 'DELETE', headers })
  if (!delRes.ok) throw new Error(`Failed to delete subscription: ${delRes.status} ${await delRes.text()}`)
}

// --- Scanner test helpers ---
// Mirrors the exact reads/writes AdminScanner.tsx's onScan() does against
// `tickets`, so the single-use validation rule can be tested without a real
// camera + rendered QR code (browser test environments have neither).

export async function insertTicket(eventId: string, registrationId: string): Promise<{ id: string; token: string }> {
  const serviceRoleKey = requireServiceRoleKey()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tickets`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ event_id: eventId, registration_id: registrationId }),
  })
  if (!res.ok) throw new Error(`Failed to insert ticket: ${res.status} ${await res.text()}`)
  const [row] = await res.json()
  return { id: row.id, token: row.token }
}

export async function getTicketByToken(token: string, eventId: string): Promise<{ id: string; validated_at: string | null } | null> {
  const serviceRoleKey = requireServiceRoleKey()
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/tickets?token=eq.${token}&event_id=eq.${eventId}&select=id,validated_at`,
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } }
  )
  if (!res.ok) throw new Error(`Failed to read ticket: ${res.status} ${await res.text()}`)
  const [row] = await res.json()
  return row ?? null
}

export async function validateTicket(token: string): Promise<void> {
  const serviceRoleKey = requireServiceRoleKey()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tickets?token=eq.${token}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ validated_at: new Date().toISOString() }),
  })
  if (!res.ok) throw new Error(`Failed to validate ticket: ${res.status} ${await res.text()}`)
}

export async function deleteTicketAndRegistration(ticketId: string, registrationId: string): Promise<void> {
  const serviceRoleKey = requireServiceRoleKey()
  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` }
  await fetch(`${SUPABASE_URL}/rest/v1/tickets?id=eq.${ticketId}`, { method: 'DELETE', headers })
  await fetch(`${SUPABASE_URL}/rest/v1/registrations?id=eq.${registrationId}`, { method: 'DELETE', headers })
}
