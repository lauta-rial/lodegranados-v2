import { test, expect } from '@playwright/test'
import {
  ANON_KEY, callEdgeFunction, callRpc,
  getEventPrice, getLatestPendingCheckout, deletePendingCheckout,
  getRegistrationByEmail, getSubscriptionByPreapprovalId,
} from './supabase-admin'

// Regression coverage for 3 critical vulnerabilities found in the 2026-07-04
// audit (see memory: project-audit-2026-07-04) and fixed the same day — all
// three let someone get real value (tickets, a subscription, a cheaper
// price) without a real approved MercadoPago payment. Fully automated, no
// MP sandbox card needed: these exploits never touched MercadoPago at all,
// which was exactly the problem.
const EVENT_ID = '09e0bd67-0667-497d-a055-a0169817a207' // Cata de Malbec Mendocino, real price in DB
const PLAN_ID = '130f5c67-e1dc-494e-8d39-767b10deeafe' // Club DeVinos — Esencial, has a real mp_plan_id

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

  // Club DeVinos plans are real recurring MercadoPago PreApproval
  // subscriptions since 2026-07-04 — the verification signal changed from
  // paymentId (one-time checkout/preferences) to preapprovalId (a real
  // authorized recurring mandate, checked against GET /preapproval/{id}).
  test('subscription: a fabricated preapprovalId is rejected and creates nothing', async () => {
    const fakePreapprovalId = 'e2e-fake-preapproval-does-not-exist'

    const res = await callEdgeFunction('send-email', {
      type: 'subscription',
      preapprovalId: fakePreapprovalId,
      to: 'e2e-payment-exploit-2@example.com',
      name: 'Attacker',
    })

    expect(res.status).toBe(403)

    const sub = await getSubscriptionByPreapprovalId(fakePreapprovalId)
    expect(sub).toBeNull()
  })

  // The monthly recurring-charge receipt (subscription_charged) is fired by
  // mp-webhook without pre-verifying the authorized_payment itself — same
  // defense-in-depth as everywhere else here: send-email re-checks
  // independently against MP before sending anything.
  test('subscription_charged: a fabricated authorizedPaymentId is rejected', async () => {
    const res = await callEdgeFunction('send-email', {
      type: 'subscription_charged',
      authorizedPaymentId: 'e2e-fake-authorized-payment-does-not-exist',
    })

    expect(res.status).toBe(403)
  })
})

test.describe('payment security — Club plans cannot go through the one-time checkout', () => {
  // create-mp-preference used to accept type:'plan' as a one-time payment,
  // which is exactly the bug this whole recurring-billing rework fixed: it
  // created an "active" subscription after a single charge that never
  // recurred again. Rejecting it outright here means that door can't be
  // reopened by a stray client call even if something upstream regresses.
  test('type:plan is rejected outright, no pending_checkout is created', async () => {
    const res = await callEdgeFunction('create-mp-preference', {
      type: 'plan',
      id: PLAN_ID,
      title: 'Club DeVinos — Esencial',
      price: 1,
      quantity: 1,
      siteUrl: 'http://localhost:5173',
    }, ANON_KEY)

    expect(res.status).toBe(400)

    const pending = await getLatestPendingCheckout(PLAN_ID)
    // Clean up defensively even on an unexpected regression, so a failing
    // run here doesn't also corrupt the next run's baseline (same lesson
    // as spots-integrity.spec.ts's try/finally fix).
    if (pending) await deletePendingCheckout(pending.id)
    expect(pending).toBeNull()
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
