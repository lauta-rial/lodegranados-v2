import { test, expect } from '@playwright/test'
import { SUPABASE_URL, ANON_KEY, getAccessToken } from './supabase-admin'

// Fully automated (API-level, no UI). Covers "Mi Sucursal": a branch admin can
// edit their own branch's content, cannot touch another branch (RLS), and
// cannot change the structural fields slug/active (superadmin-only trigger).
const PICHINCHA_ADMIN = { email: 'whatsapp.assistance.v1+pichinchaadmin@gmail.com', password: 'TestResend123!' }
const PICHINCHA_BRANCH = '46266453-08ae-4bc5-a0d9-9d93214d0ad2'
const CENTRO_BRANCH = 'ccddd032-4a65-4c01-90b3-f5a05787c88d'

function patchBranch(branchId: string, token: string, body: unknown) {
  return fetch(`${SUPABASE_URL}/rest/v1/branches?id=eq.${branchId}`, {
    method: 'PATCH',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
}

test.describe('Mi Sucursal', () => {
  test('a branch admin can edit their own branch content', async () => {
    const token = await getAccessToken(PICHINCHA_ADMIN.email, PICHINCHA_ADMIN.password)
    try {
      const res = await patchBranch(PICHINCHA_BRANCH, token, { province: 'Santa Fe' })
      expect(res.status).toBe(200)
      expect(await res.json()).toHaveLength(1)
    } finally {
      await patchBranch(PICHINCHA_BRANCH, token, { province: null })
    }
  })

  test('a branch admin cannot edit another branch (RLS → 0 rows)', async () => {
    const token = await getAccessToken(PICHINCHA_ADMIN.email, PICHINCHA_ADMIN.password)
    const res = await patchBranch(CENTRO_BRANCH, token, { province: 'Nope' })
    expect(res.ok).toBeTruthy() // 200 — but RLS filters it to nothing
    expect(await res.json()).toHaveLength(0)
  })

  test('a branch admin cannot change slug or active (superadmin-only trigger)', async () => {
    const token = await getAccessToken(PICHINCHA_ADMIN.email, PICHINCHA_ADMIN.password)

    const slugRes = await patchBranch(PICHINCHA_BRANCH, token, { slug: 'pichincha-hack' })
    expect(slugRes.ok).toBeFalsy()
    expect(await slugRes.text()).toContain('superadmin')

    const activeRes = await patchBranch(PICHINCHA_BRANCH, token, { active: false })
    expect(activeRes.ok).toBeFalsy()
    expect(await activeRes.text()).toContain('superadmin')
  })
})
