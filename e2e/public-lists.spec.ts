import { test, expect } from '@playwright/test'

// Guest (no login) — the public branch pages must render their catalog. Uses
// Pichincha's real seeded content (the only branch with data). Each test runs
// in a fresh context, so there's no logged-in session.
test.describe('public branch pages (guest)', () => {
  test('catas list renders a real cata', async ({ page }) => {
    await page.goto('/pichincha/catas')
    await expect(page.getByText('Cata de Malbec Mendocino')).toBeVisible()
  })

  test('cursos list renders a real curso', async ({ page }) => {
    await page.goto('/pichincha/cursos')
    await expect(page.getByText('Introducción al Mundo del Vino')).toBeVisible()
  })

  test('club list renders the plans', async ({ page }) => {
    await page.goto('/pichincha/club')
    await expect(page.getByRole('heading', { name: 'Club DeVinos' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Esencial' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Gran Reserva' })).toBeVisible()
  })

  test('ClubPlan detail shows the subscribe CTA for a guest', async ({ page }) => {
    await page.goto('/pichincha/club/130f5c67-e1dc-494e-8d39-767b10deeafe')
    await expect(page.getByRole('button', { name: /Suscribirme al Esencial/ })).toBeVisible()
  })
})
