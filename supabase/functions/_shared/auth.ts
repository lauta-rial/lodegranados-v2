import type { SupabaseClient, User } from "jsr:@supabase/supabase-js@2"
import { jsonResponse } from "./http.ts"

// Verifies the caller's JWT and returns their User (app_metadata.role
// included) — or a ready-to-return 401 Response if the JWT is missing or
// invalid. manage-staff and assign-host each re-derived this same
// extract-JWT-then-getUser block independently; this is the version to
// import instead of writing a third copy.
export async function getCaller(
  req: Request,
  admin: SupabaseClient,
): Promise<{ user: User } | { response: Response }> {
  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data: { user }, error } = await admin.auth.getUser(jwt)
  if (error || !user) {
    return { response: jsonResponse({ error: 'No autenticado' }, 401) }
  }
  return { user }
}

// This project's GoTrue admin API throws AuthRetryableFetchError on
// auth.admin.* calls intermittently — confirmed via direct repeated testing
// (the identical call fails, then succeeds on retry with nothing else
// changed). 5 attempts with growing backoff clears it reliably in testing.
export async function withRetry<T>(
  fn: () => Promise<{ data: T; error: { message: string } | null }>,
  attempts = 5,
): Promise<T> {
  let lastError: { message: string } | null = null
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await fn()
    if (!error) return data
    lastError = error
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 400 * (i + 1)))
  }
  throw lastError
}
