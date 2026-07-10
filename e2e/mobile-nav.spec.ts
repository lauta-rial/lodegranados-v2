import { test, expect } from '@playwright/test'
import { SUPERADMIN, loginAdmin } from './admin-helpers'

// Below lg the admin sidebar collapses into a hamburger drawer (so the Club
// scanner etc. are usable on a phone). Verify the drawer is parked off-screen
// and slides in when the hamburger is tapped.
test.describe('admin sidebar drawer on mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('the sidebar is a hamburger drawer at 375px', async ({ page }) => {
    await loginAdmin(page, SUPERADMIN)

    const hamburger = page.getByRole('button', { name: 'Abrir menú' })
    await expect(hamburger).toBeVisible()

    const aside = page.locator('aside')
    const before = await aside.boundingBox()
    expect(before!.x).toBeLessThan(0) // parked off-screen

    await hamburger.click()
    await page.waitForTimeout(350) // slide-in transition
    const after = await aside.boundingBox()
    expect(after!.x).toBe(0) // slid on-screen
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
  })
})
