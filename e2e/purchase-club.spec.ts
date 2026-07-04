import { test, expect } from '@playwright/test'
import { waitForEmail } from './resend-client'
import { deleteLatestSubscription } from './supabase-admin'
import { loginCheckoutTester, payWithTestCardSubscription, CHECKOUT_TEST } from './purchase-helpers'

const PLAN_ID = process.env.E2E_PLAN_ID ?? '8175c125-0969-4975-98ea-3fcefd87fbb2' // Gran Reserva
const PLAN_PATH = process.env.E2E_PLAN_PATH ?? '/pichincha/club/8175c125-0969-4975-98ea-3fcefd87fbb2'

// Real recurring MercadoPago PreApproval subscription since 2026-07-04 (see
// project_audit_2026-07-04) — "Suscribirme" now redirects to MP's dedicated
// subscription checkout (accept terms → choose payment method → card form),
// not the one-off checkout/preferences flow the other purchase-*.spec.ts
// files use. See payWithTestCardSubscription for that flow's exact steps.
test('subscribe to a Club plan end-to-end (manual card entry)', async ({ page }) => {
  await loginCheckoutTester(page)

  await page.goto(PLAN_PATH)
  await page.getByRole('button', { name: /^Suscribirme/ }).click()
  await payWithTestCardSubscription(page, CHECKOUT_TEST.email)

  await waitForEmail(CHECKOUT_TEST.email, 'Bienvenido/a al Club DeVinos — Lo de Granados', { timeoutMs: 45_000 })

  await deleteLatestSubscription(PLAN_ID)
})
