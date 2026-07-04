import { expect, type Page } from '@playwright/test'

// Shared by every purchase-*.spec.ts file — NOT for CI, since payWithTestCard
// pauses mid-test waiting for a human to complete the MercadoPago card form.
// MP's checkout blocks automated pointer events on the entire card-form page
// (not just the Pagar button), so there's no way to script past it (see
// memory: mp-sandbox-testing). Run with `npx playwright test <name> --headed`
// and complete the card form yourself when the Inspector pops up.
export const TEST_CARD = {
  number: '5031 7557 3453 0604', // Mastercard sandbox
  holder: 'APRO', // triggers an approved payment
  expiry: '11/30',
  cvv: '123',
  dni: '12345678',
}

// One persistent, permanent buyer account for every purchase-*.spec.ts file
// — replaces the old pattern of registering a brand-new disposable account
// per run (a fresh `+clubtest${Date.now()}@gmail.com` etc every single
// time), which had no cleanup and left ~35 throwaway accounts piled up in
// auth.users after a single day of testing. This account is a plain buyer
// with no role, safe to reuse indefinitely across runs — nothing about a
// purchase depends on the buyer account itself being fresh.
export const CHECKOUT_TEST = { email: 'whatsapp.assistance.v1+checkout@gmail.com', password: 'TestResend123!' }

// Logs in the persistent CHECKOUT_TEST buyer via password — deliberately
// not the register+email-confirmation flow (that's what
// register-confirm-welcome.spec.ts exists to test, and needs a fresh
// account every time). A password login also sidesteps a real race that
// register+confirm had: signInWithPassword resolves with the session
// before the button click's own promise does, so a page.goto() right after
// is safe — email confirmation's hash-based session detection resolves
// asynchronously *after* the page first renders, and a hard navigation
// timed just wrong could fire before that write finished, silently landing
// the next page logged out (confirmed: this happened repeatedly in this
// session on the old registerAndConfirm-based purchase-club.spec.ts).
export async function loginCheckoutTester(page: Page): Promise<void> {
  // Clear MP cookies from any previous run in this browser — if the checkout
  // finds a logged-in MP test account matching the seller, it fails with
  // "una de las partes es de prueba" instead of showing guest checkout.
  await page.context().clearCookies()

  await page.goto('/login')
  await page.getByRole('textbox', { name: 'tu@email.com' }).fill(CHECKOUT_TEST.email)
  await page.getByRole('textbox', { name: '••••••••' }).fill(CHECKOUT_TEST.password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  // Navbar.tsx shows user_metadata.full_name if set, otherwise the email's
  // local part (not the full address) — CHECKOUT_TEST has no full_name.
  await expect(page.getByRole('button', { name: CHECKOUT_TEST.email.split('@')[0] })).toBeVisible()
}

// Call once the checkout has already redirected to MercadoPago and "Tarjeta"
// is about to be (or has been) selected — completes the guest-checkout card
// step, then waits for the human, then confirms the redirect back succeeded.
export async function payWithTestCard(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: 'Tarjeta Crédito, débito o' }).click()

  console.log(`\n>>> Complete the card form for ${label} and click Pagar:`)
  console.log(TEST_CARD)
  await page.pause()

  await expect(page).toHaveURL(/\/pago-exitoso/, { timeout: 30_000 })
}

// Club DeVinos subscriptions redirect to MercadoPago's separate
// subscription/PreApproval checkout — a genuinely different UI from the
// one-off checkout/preferences flow payWithTestCard above handles (confirmed
// by walking through it directly): accept terms → choose payment method
// (labeled just "Tarjeta Crédito", not "Tarjeta Crédito, débito o") → card
// form. Same manual-pause pattern from there.
export async function payWithTestCardSubscription(page: Page, label: string): Promise<void> {
  await page.getByRole('checkbox', { name: /Acepto los Términos y condiciones/ }).click()
  await page.getByRole('button', { name: 'Elegir medio de pago' }).click()
  await page.getByRole('button', { name: 'Tarjeta Crédito' }).click()

  console.log(`\n>>> Complete the card form for ${label} and click Pagar:`)
  console.log(TEST_CARD)
  await page.pause()

  await expect(page).toHaveURL(/\/pago-exitoso/, { timeout: 30_000 })
}
