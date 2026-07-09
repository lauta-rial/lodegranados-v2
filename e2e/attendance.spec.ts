import { test, expect } from '@playwright/test'
import {
  insertRegistration, getTicketsForRegistration, validateTicket,
  getRegistrationAttended, deleteRegistration,
} from './supabase-admin'

// Fully automated (no camera / no rendered QR). Attendance for catas is
// derived automatically: a validated ticket flips its registration to present
// (SÍ). Seeds a throwaway registration on a real cata, validates one of its
// (trigger-generated) tickets, and asserts the attendance trigger fired.
const MALBEC_EVENT_ID = '09e0bd67-0667-497d-a055-a0169817a207' // Cata de Malbec Mendocino

test.describe('auto-attendance for catas', () => {
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, 'requires SUPABASE_SERVICE_ROLE_KEY')

  test('validating a ticket marks its registration present (attended = true)', async () => {
    const regId = await insertRegistration(MALBEC_EVENT_ID, 1)
    try {
      expect(await getRegistrationAttended(regId)).toBeNull() // starts pending (—)

      const tickets = await getTicketsForRegistration(regId)
      expect(tickets.length).toBeGreaterThan(0)

      await validateTicket(tickets[0].token)
      expect(await getRegistrationAttended(regId)).toBe(true)
    } finally {
      await deleteRegistration(regId)
    }
  })
})
