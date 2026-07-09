import { test, expect } from '@playwright/test'
import {
  getActiveSubscription, insertClubRedemption, deleteClubRedemptions,
  getAccessToken, serviceRoleKey,
} from './supabase-admin'

// Fully automated (no MP / no manual card). Covers the Club monthly-wine
// redemption ("canjes"): the DB guard against a double pickup in the same
// month, and the RLS that only admins can register a redemption. Uses a
// far-future period so it never collides with a real pickup.
const CHECKOUT_TEST = { email: 'whatsapp.assistance.v1+checkout@gmail.com', password: 'TestResend123!' }

test.describe('club redemption (canjes)', () => {
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, 'requires SUPABASE_SERVICE_ROLE_KEY')

  test('a redemption cannot be registered twice in the same period', async () => {
    const sub = await getActiveSubscription()
    expect(sub, 'need an active subscription to test against').toBeTruthy()
    const period = '2099-01'
    try {
      const first = await insertClubRedemption(sub!.id, period, serviceRoleKey())
      expect(first.status).toBe(201)
      const dupe = await insertClubRedemption(sub!.id, period, serviceRoleKey())
      // club_redemptions_subscription_id_period_key (UNIQUE) — a double pickup
      // is impossible even under a double scan.
      expect(dupe.status).toBe(409)
    } finally {
      await deleteClubRedemptions(sub!.id, period)
    }
  })

  test('a non-admin user cannot register a redemption (RLS)', async () => {
    const sub = await getActiveSubscription()
    expect(sub).toBeTruthy()
    const period = '2099-02'
    const userToken = await getAccessToken(CHECKOUT_TEST.email, CHECKOUT_TEST.password)
    try {
      const res = await insertClubRedemption(sub!.id, period, userToken)
      // "Admin manage club_redemptions" is the only write policy — a normal
      // user has no matching INSERT policy, so PostgREST rejects it.
      expect(res.ok).toBeFalsy()
    } finally {
      // Safety net in case RLS were broken and the row went through.
      await deleteClubRedemptions(sub!.id, period)
    }
  })
})
