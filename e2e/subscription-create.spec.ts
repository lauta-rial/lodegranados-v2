import { test, expect } from '@playwright/test'
import { callEdgeFunction } from './supabase-admin'

// create-mp-subscription's input guards, exercised directly. All of these
// return before any MercadoPago call, so no preapproval is created and there's
// nothing to clean up. (The happy path — a real preapproval + external_reference
// carrying sub:<branch>:<user>:<plan> — needs a live MP round-trip and is
// covered manually.)
const PICHINCHA_BRANCH = '46266453-08ae-4bc5-a0d9-9d93214d0ad2'

test.describe('create-mp-subscription validation', () => {
  test('rejects a missing plan, branch, or payer email (400)', async () => {
    const noPlan = await callEdgeFunction('create-mp-subscription', { branchId: PICHINCHA_BRANCH, payerEmail: 'a@b.com' })
    expect(noPlan.status).toBe(400)
    const noBranch = await callEdgeFunction('create-mp-subscription', { planId: 'x', payerEmail: 'a@b.com' })
    expect(noBranch.status).toBe(400)
    const noEmail = await callEdgeFunction('create-mp-subscription', { planId: 'x', branchId: PICHINCHA_BRANCH })
    expect(noEmail.status).toBe(400)
  })

  test('rejects an unknown plan (404)', async () => {
    const res = await callEdgeFunction('create-mp-subscription', {
      planId: '00000000-0000-0000-0000-000000000000',
      branchId: PICHINCHA_BRANCH,
      payerEmail: 'a@b.com',
    })
    expect(res.status).toBe(404)
  })
})
