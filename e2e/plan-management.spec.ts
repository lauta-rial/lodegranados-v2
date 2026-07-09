import { test, expect } from '@playwright/test'
import { SUPABASE_URL, ANON_KEY, getAccessToken } from './supabase-admin'

// Fully automated (API-level). Club plans are company-wide and superadmin-only
// to write now — a branch admin sees them read-only. This proves the RLS
// ("Superadmin manage plans") blocks a branch admin's write at the DB.
const PICHINCHA_ADMIN = { email: 'whatsapp.assistance.v1+pichinchaadmin@gmail.com', password: 'TestResend123!' }
const ESENCIAL_PLAN = '130f5c67-e1dc-494e-8d39-767b10deeafe'

test('a branch admin cannot edit a plan (plans are superadmin-only → 0 rows)', async () => {
  const token = await getAccessToken(PICHINCHA_ADMIN.email, PICHINCHA_ADMIN.password)
  // Same-value price write — harmless even if RLS were broken and it landed.
  const res = await fetch(`${SUPABASE_URL}/rest/v1/plans?id=eq.${ESENCIAL_PLAN}`, {
    method: 'PATCH',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ price: 50 }),
  })
  expect(res.ok).toBeTruthy() // 200
  expect(await res.json()).toHaveLength(0) // RLS filtered it — only superadmin writes plans
})
