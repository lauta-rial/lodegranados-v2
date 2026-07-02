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
