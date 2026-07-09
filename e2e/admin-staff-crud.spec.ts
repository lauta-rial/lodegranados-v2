import { test, expect } from '@playwright/test'
import { SUPERADMIN, loginAdmin } from './admin-helpers'
import { deleteUserByEmail, getUserIdByEmail, getEventHostsForEvent, deleteEventHost } from './supabase-admin'

// Fully automated — no MP, no manual card entry. admin-access-control.spec.ts
// and host-role.spec.ts already cover access control around these pages;
// this exercises the CRUD itself (manage-staff invite/revoke, assign-host).

const UNASSIGNED_EVENT_ID = '9d0428a4-f870-46cd-8e8c-fe9576f3862a' // Cata Vertical — Cabernet Sauvignon, same fixture host-role.spec.ts relies on staying unassigned
const HOST_TEST_EMAIL = 'whatsapp.assistance.v1+hosttest@gmail.com' // real, permanent fixture from host-role.spec.ts

test('invite a host account, see it in the Staff list, then revoke it', async ({ page }) => {
  const email = `whatsapp.assistance.v1+e2e-staff-${Date.now()}@gmail.com`

  await loginAdmin(page, SUPERADMIN)
  await page.goto('/admin/staff')

  try {
    await page.getByRole('button', { name: 'Nueva cuenta' }).click()
    await page.getByPlaceholder('nombre@ejemplo.com').fill(email)
    // Neither <select> label is htmlFor-linked — same pattern as elsewhere
    // in this admin panel — so these go by position: Rol first, Sucursal
    // second, both getByRole('combobox') in modal order.
    await page.getByRole('combobox').nth(0).selectOption({ label: 'Host — escanea entradas de sus eventos asignados' })
    await page.getByRole('combobox').nth(1).selectOption({ label: 'Pichincha' })
    await page.getByRole('button', { name: 'Crear cuenta' }).click()

    const row = page.getByRole('row', { name: new RegExp(email.replace(/[.+]/g, '\\$&')) })
    await expect(row).toBeVisible({ timeout: 15_000 }) // inviteUserByEmail + 2 emails take a moment
    await expect(row.getByText('Host')).toBeVisible()
    await expect(row.getByText('Pichincha')).toBeVisible()

    page.once('dialog', (d) => d.accept())
    await row.getByRole('button', { name: 'Quitar acceso' }).click()
    await expect(row).toHaveCount(0)
  } finally {
    await deleteUserByEmail(email)
  }
})

test('assign an existing host to an event, then remove them, via the event editor', async ({ page }) => {
  const hostUserId = await getUserIdByEmail(HOST_TEST_EMAIL)
  expect(hostUserId).toBeTruthy()

  await loginAdmin(page, SUPERADMIN)
  await page.goto('/admin/catas')

  try {
    // Hosts management moved from a per-row icon into the event edit modal:
    // open the editor, then use the inline "Hosts" section inside it.
    const eventRow = page.getByRole('row', { name: /Cata Vertical/ })
    await eventRow.getByRole('button', { name: 'Editar' }).click()

    await expect(page.getByRole('heading', { name: 'Hosts' })).toBeVisible()
    await expect(page.getByText('No hay hosts asignados todavía.')).toBeVisible()

    // Scope to the hosts <select> (the superadmin modal also has a Sucursal
    // combobox) by the one that lists the host email as an option.
    const hostSelect = page.getByRole('combobox').filter({ has: page.getByRole('option', { name: HOST_TEST_EMAIL }) })
    await hostSelect.selectOption({ label: HOST_TEST_EMAIL })
    await page.getByRole('button', { name: 'Asignar' }).click()

    const assignedRow = page.getByText(HOST_TEST_EMAIL)
    await expect(assignedRow).toBeVisible()

    page.once('dialog', (d) => d.accept())
    await page.getByRole('listitem').filter({ hasText: HOST_TEST_EMAIL }).getByRole('button').click()
    await expect(page.getByText('No hay hosts asignados todavía.')).toBeVisible()
  } finally {
    // Safety net — host-role.spec.ts's RLS-negative-check depends on this
    // event staying genuinely unassigned; make sure it does even if an
    // assertion above threw before the UI removal step ran.
    const hosts = await getEventHostsForEvent(UNASSIGNED_EVENT_ID)
    if (hosts.some((h) => h.user_id === hostUserId)) {
      await deleteEventHost(UNASSIGNED_EVENT_ID, hostUserId!)
    }
  }
})
