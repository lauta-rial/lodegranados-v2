import { test, expect } from '@playwright/test'
import { SUPERADMIN, loginAdmin } from './admin-helpers'
import { getLatestInquiryByEmail, deleteInquiry, deleteNewsletterSubscriberByEmail } from './supabase-admin'

// Fully automated — no MP, no manual card entry.

test('Empresas inquiry form writes to inquiries and shows up on the admin Dashboard', async ({ page }) => {
  const email = `whatsapp.assistance.v1+e2e-empresas-${Date.now()}@gmail.com`

  await page.goto('/pichincha/empresas')
  await page.getByRole('textbox', { name: 'Juan Pérez — Empresa SRL' }).fill('E2E Corp SRL')
  await page.getByRole('textbox', { name: 'juan@empresa.com' }).fill(email)
  await page.getByPlaceholder(/Contanos la ocasión/).fill('Evento de fin de año para 40 personas, primera semana de diciembre.')
  await page.getByRole('button', { name: 'Enviar consulta' }).click()

  await expect(page.getByRole('heading', { name: '¡Consulta recibida!' })).toBeVisible()

  try {
    // The insert happens directly from the client (no edge function) — this
    // is the whole point of the test, confirming the RLS anon-insert policy
    // still works and that a superadmin actually sees it end to end, not
    // just that the form didn't throw.
    await loginAdmin(page, SUPERADMIN)
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Consultas recientes' })).toBeVisible()
    await expect(page.getByRole('cell', { name: email })).toBeVisible()
  } finally {
    const inquiry = await getLatestInquiryByEmail(email)
    if (inquiry) await deleteInquiry(inquiry.id)
  }
})

test('FAQ accordion expands and collapses an answer', async ({ page }) => {
  await page.goto('/pichincha/faq')

  const question = page.getByRole('button', { name: '¿Cómo funciona el Club DeVinos?' })
  const answer = page.getByText(/selección de vinos curada por nuestro sommelier/i)
  // The answer <p> is always in the DOM — collapse is a CSS transition on
  // its wrapping div (max-h-0/opacity-0 vs max-h-96/opacity-100), which
  // Playwright's toBeVisible() doesn't reliably treat as hidden. Assert on
  // the wrapper's class instead, per AccordionItem's actual implementation.
  const answerWrapper = answer.locator('..')

  await expect(answerWrapper).toHaveClass(/max-h-0/)
  await question.click()
  await expect(answerWrapper).toHaveClass(/max-h-96/)
  await question.click()
  await expect(answerWrapper).toHaveClass(/max-h-0/)
})

test('BranchHome renders the hero, experience CTAs, and next cata (if any)', async ({ page }) => {
  await page.goto('/pichincha')

  // BranchHome's h1 is the branch's own name (branch.name), not the site
  // brand — "Lo de Granados" only appears in the navbar/footer here.
  await expect(page.getByRole('heading', { name: 'Pichincha', level: 1 })).toBeVisible()

  // The 3 experience cards are links whose full accessible name includes
  // their blurb + CTA text ("Catas de Vino Noches íntimas... Ver catas") —
  // same short label ("Catas de Vino"/"Cursos"/"Club DeVinos") also repeats
  // as plain links in the navbar and footer, but only these cards render
  // it as an h3, so matching on heading role + level is unambiguous.
  await expect(page.getByRole('heading', { name: 'Catas de Vino', level: 3 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cursos', level: 3 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Club DeVinos', level: 3 })).toBeVisible()

  // Pichincha has real seeded active catas, so "Próximamente" should render
  // — if this ever legitimately has zero active events, this assertion is
  // the signal to revisit it, not silently skip.
  const reservarBtn = page.getByRole('link', { name: 'Reservar lugar' })
  await expect(reservarBtn).toBeVisible()
  await expect(reservarBtn).toHaveAttribute('href', /^\/pichincha\/catas\//)
})

test('newsletter signup succeeds once, then reports a duplicate on the same email', async ({ page }) => {
  const email = `whatsapp.assistance.v1+e2e-newsletter-${Date.now()}@gmail.com`

  try {
    await page.goto('/pichincha')
    await page.getByPlaceholder('tu@email.com').fill(email)
    await page.getByRole('button', { name: 'Suscribirme' }).click()
    await expect(page.getByText('¡Gracias!')).toBeVisible()

    // The form is unmounted once status flips to 'success' — reload to get
    // a fresh idle form back before resubmitting.
    await page.reload()
    await page.getByPlaceholder('tu@email.com').fill(email)
    await page.getByRole('button', { name: 'Suscribirme' }).click()
    await expect(page.getByText('Ese email ya está suscripto.')).toBeVisible()
  } finally {
    await deleteNewsletterSubscriberByEmail(email)
  }
})
