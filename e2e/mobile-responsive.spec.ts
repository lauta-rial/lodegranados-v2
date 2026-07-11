import { test, expect, type Page } from '@playwright/test'
import { SUPERADMIN, loginAdmin } from './admin-helpers'

// Encodes the CLAUDE.md rule "test all pages at 375px width": no page may
// scroll horizontally on a phone. This is the regression guard for the class
// of bug fixed this cycle (MiCuenta's profile header overflowing 147px on a
// long name/email). Everything here runs at a 375px viewport.
test.use({ viewport: { width: 375, height: 812 } })

async function horizontalOverflowPx(page: Page): Promise<number> {
  // Let late layout (images, fonts) settle before measuring.
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(300)
  return page.evaluate(() => {
    const d = document.documentElement
    return Math.max(0, d.scrollWidth - d.clientWidth)
  })
}

// Public routes (guest) — real Pichincha content so detail pages actually render.
const PUBLIC_ROUTES: Record<string, string> = {
  'network home': '/',
  'branch home': '/pichincha',
  'catas list': '/pichincha/catas',
  'cata detail': '/pichincha/catas/09e0bd67-0667-497d-a055-a0169817a207',
  'cursos list': '/pichincha/cursos',
  'curso detail': '/pichincha/cursos/ed4bfb95-03ae-4270-a45e-4a31af54c240',
  'club list': '/pichincha/club',
  'club plan detail': '/pichincha/club/130f5c67-e1dc-494e-8d39-767b10deeafe',
  empresas: '/pichincha/empresas',
  faq: '/pichincha/faq',
  login: '/login',
  register: '/register',
}

test.describe('mobile: no horizontal overflow at 375px', () => {
  for (const [name, route] of Object.entries(PUBLIC_ROUTES)) {
    test(`${name} does not scroll horizontally`, async ({ page }) => {
      await page.goto(route)
      // Tolerate 1px of sub-pixel rounding.
      expect(await horizontalOverflowPx(page), `${route} overflows`).toBeLessThanOrEqual(1)
    })
  }

  test('Mi Cuenta (logged in) does not scroll horizontally', async ({ page }) => {
    // Regression guard for the profile-header overflow fix — SUPERADMIN has a
    // long email that used to push the header off-screen.
    await loginAdmin(page, SUPERADMIN)
    await page.goto('/mi-cuenta')
    expect(await horizontalOverflowPx(page)).toBeLessThanOrEqual(1)
  })
})

test.describe('mobile: sticky CTA on detail pages', () => {
  test('ClubPlan shows a sticky mobile subscribe bar', async ({ page }) => {
    await page.goto('/pichincha/club/130f5c67-e1dc-494e-8d39-767b10deeafe')
    // The mobile-only fixed bottom bar carries a "Suscribirme" button.
    const stickyBar = page.locator('.fixed.bottom-0').filter({ hasText: /Suscribirme/ })
    await expect(stickyBar).toBeVisible()
  })

  test('CataDetail shows a sticky mobile reserve bar', async ({ page }) => {
    await page.goto('/pichincha/catas/09e0bd67-0667-497d-a055-a0169817a207')
    const stickyBar = page.locator('.fixed.bottom-0').filter({ hasText: /Reservar/ })
    await expect(stickyBar).toBeVisible()
  })
})
