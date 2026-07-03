import { test, expect } from '@playwright/test'
import { waitForEmail } from './resend-client'
import { deleteLatestSubscription } from './supabase-admin'
import { registerAndConfirm, payWithTestCard } from './purchase-helpers'

const PLAN_ID = process.env.E2E_PLAN_ID ?? '8175c125-0969-4975-98ea-3fcefd87fbb2' // Gran Reserva
const PLAN_PATH = process.env.E2E_PLAN_PATH ?? '/pichincha/club/8175c125-0969-4975-98ea-3fcefd87fbb2'
const BUYER_EMAIL = `whatsapp.assistance.v1+clubtest${Date.now()}@gmail.com`
const BUYER_PASSWORD = 'TestResend123!'

test('subscribe to a Club plan end-to-end (manual card entry)', async ({ page }) => {
  await registerAndConfirm(page, BUYER_EMAIL, BUYER_PASSWORD)

  await page.goto(PLAN_PATH)
  await page.getByRole('button', { name: /^Suscribirme/ }).click()
  await payWithTestCard(page, BUYER_EMAIL)

  await waitForEmail(BUYER_EMAIL, 'Bienvenido/a al Club DeVinos — Lo de Granados', { timeoutMs: 45_000 })

  await deleteLatestSubscription(PLAN_ID)
})
