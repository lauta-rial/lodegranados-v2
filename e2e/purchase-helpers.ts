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

// MercadoPago's own docs for testing PreApproval subscriptions require a
// real MP "usuario de prueba" logged in through "Ingresar con mi cuenta" —
// the guest "Tarjeta" checkout that works fine for one-time payments does
// NOT work here. Confirmed the hard way, three times:
// 1. Guest checkout on a subscription silently associated the attempt with
//    whoever's real MercadoPago account owns the seller's MP_ACCESS_TOKEN —
//    a real "tu tarjeta rechazó el pago" email landed in that real
//    person's inbox — and always failed with a generic "no pudimos
//    procesar tu pago", nothing to do with our card details or app code.
// 2. A test buyer created ad hoc via POST /users/test (no explicit
//    buyer/seller type) still hit "una de las partes es de prueba" against
//    our real seller — it was created under the same application/token as
//    the seller, so MP still considered them the same test "party".
// 3. Even a properly PAIRED vendedor+comprador test account, created
//    together via MercadoPago's dashboard ("Tus integraciones" → "Cuentas
//    de prueba", one of each type, same country) — MP_TEST_BUYER below
//    ("Comprador A") — still hits the same "una de las partes es de
//    prueba" fatal error against our real seller. The seller side
//    (collector_id 83212592) is a real, non-test MercadoPago account no
//    matter which of our own credentials call the API, and MP's sandbox
//    has no way to let a real seller test a PreApproval checkout end to
//    end. This function gets a human as far into the flow as MP allows
//    (through login, up to the security-code step) — useful for manually
//    confirming everything up to that point still renders correctly — but
//    it CANNOT currently reach /pago-exitoso. Don't "fix" this by trying
//    yet another test-buyer combination; the seller identity is the
//    blocker, not the buyer.
const MP_TEST_BUYER = { nickname: 'TESTUSER7682991671644190556', password: 'HvaWovne9E' }

export async function payWithTestCardSubscription(page: Page, label: string): Promise<void> {
  await page.getByRole('checkbox', { name: /Acepto los Términos y condiciones/ }).click()
  await page.getByRole('button', { name: 'Elegir medio de pago' }).click()
  await page.getByRole('button', { name: 'Ingresar con mi cuenta' }).click()

  await page.getByRole('textbox', { name: 'DNI, e-mail o teléfono' }).fill(MP_TEST_BUYER.nickname)
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: /^Contraseña/ }).click()
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(MP_TEST_BUYER.password)
  await page.getByRole('button', { name: 'Confirmar' }).click()

  // Confirms the MP_TEST_BUYER login actually succeeded (not just that the
  // click didn't throw) before handing off to the human — a stale/rotated
  // password would otherwise only surface as an opaque 30s timeout on the
  // final toHaveURL below, with nothing pointing at a failed login as the
  // cause.
  await expect(page.getByRole('heading', { name: 'Confirmá tu suscripción' })).toBeVisible()

  // Lands on the subscription review page with Comprador A's own test card
  // already attached — only the security code (inside a secure iframe,
  // like every other card field on MP's checkout) is left, and that one
  // blocks automated input same as payWithTestCard's form above.
  console.log(`\n>>> Enter the security code for Comprador A's pre-attached test card and click "Pagar suscripción" (for ${label}):`)
  await page.pause()

  await expect(page).toHaveURL(/\/pago-exitoso/, { timeout: 30_000 })
}
