import { test, expect } from '@playwright/test'
import {
  ANON_KEY, callEdgeFunction, callRpc,
  getEventPrice, getLatestPendingCheckout, deletePendingCheckout,
  getRegistrationByEmail,
} from './supabase-admin'

// Regression coverage for 3 critical vulnerabilities found in the 2026-07-04
// audit (see memory: project-audit-2026-07-04) and fixed the same day — all
// three let someone get real value (tickets, a subscription, a cheaper
// price) without a real approved MercadoPago payment. Fully automated, no
// MP sandbox card needed: these exploits never touched MercadoPago at all,
// which was exactly the problem.
const EVENT_ID = '09e0bd67-0667-497d-a055-a0169817a207' // Cata de Malbec Mendocino, real price in DB

test.describe('payment security — send-email requires a real approved payment', () => {
  test('reservation: a fabricated paymentId is rejected and creates nothing', async () => {
    const attackerEmail = 'e2e-payment-exploit@example.com'

    const res = await callEdgeFunction('send-email', {
      type: 'reservation',
      ref: EVENT_ID,
      paymentId: '9999999999999', // does not exist on MercadoPago
      to: attackerEmail,
      name: 'Attacker',
      payerEmail: attackerEmail,
      data: { spots: 10 }, // also tries to claim 10 free tickets while at it
    })

    expect(res.status).toBe(403)

    // The real check: no registration (and therefore no tickets) ever got
    // created for the fabricated payment, regardless of the HTTP status.
    const reg = await getRegistrationByEmail(EVENT_ID, attackerEmail)
    expect(reg).toBeNull()
  })

  test('subscription: a fabricated paymentId is rejected and activates nothing', async () => {
    const res = await callEdgeFunction('send-email', {
      type: 'subscription',
      ref: '00000000-0000-0000-0000-000000000000', // never reached — rejected before the plan lookup
      paymentId: '9999999999998',
      to: 'e2e-payment-exploit-2@example.com',
      data: { priceAmount: 1 },
    })

    expect(res.status).toBe(403)
  })
})

test.describe('payment security — create-mp-preference verifies price server-side', () => {
  test('a client-supplied price is ignored in favor of the real DB price', async () => {
    const realPrice = await getEventPrice(EVENT_ID)

    // create-mp-preference requires a valid JWT (verify_jwt: true) but not
    // any particular role — the anon key itself is a validly-signed JWT,
    // which is exactly why this endpoint had to defend itself server-side
    // rather than relying on "you need to be logged in" as a price guard.
    await callEdgeFunction('create-mp-preference', {
      type: 'event',
      id: EVENT_ID,
      title: 'Cata de Malbec Mendocino',
      price: 1, // the attacker's claimed price — must be ignored
      quantity: 1,
      siteUrl: 'http://localhost:5173',
    }, ANON_KEY)

    const pending = await getLatestPendingCheckout(EVENT_ID)
    expect(pending).not.toBeNull()
    expect(pending!.price).toBe(realPrice)
    expect(pending!.price).not.toBe(1)

    await deletePendingCheckout(pending!.id)
  })
})

test.describe('payment security — ticket-generation RPCs are not directly callable', () => {
  test('backfill_tickets_for_registration/session reject anon and authenticated callers', async () => {
    const resReg = await callRpc('backfill_tickets_for_registration', {
      p_registration_id: '00000000-0000-0000-0000-000000000000',
      p_event_id: '00000000-0000-0000-0000-000000000000',
      p_spots: 999,
    })
    expect(resReg.status).toBe(401)
    expect((await resReg.json()).message).toContain('permission denied')

    const resSession = await callRpc('backfill_tickets_for_session', {
      p_session_id: '00000000-0000-0000-0000-000000000000',
      p_event_id: '00000000-0000-0000-0000-000000000000',
    })
    expect(resSession.status).toBe(401)
    expect((await resSession.json()).message).toContain('permission denied')
  })
})
