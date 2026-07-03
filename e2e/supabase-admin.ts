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
