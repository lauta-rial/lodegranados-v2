import { test, expect } from '@playwright/test'
import {
  getAvailableSpots, insertRegistration, deleteRegistration,
  getCourseSpots, insertEnrollment, deleteEnrollment, updateRegistrationStatus,
} from './supabase-admin'

// No browser needed — these hit the DB directly to verify the self-healing
// triggers (migrations: self_healing_event_available_spots,
// add_total_spots_and_self_healing_course_spots) recalculate available_spots
// correctly on every insert/delete, without going through a real MP purchase.
// Requires SUPABASE_SERVICE_ROLE_KEY.

const MALBEC_EVENT_ID = '09e0bd67-0667-497d-a055-a0169817a207' // total_spots 20
const CATA_VERTICAL_EVENT_ID = '9d0428a4-f870-46cd-8e8c-fe9576f3862a' // total_spots 12, used as an "unrelated event" control
const SOMMELIER_COURSE_ID = 'ed4bfb95-03ae-4270-a45e-4a31af54c240' // total_spots 10

test.describe('available_spots self-healing triggers', () => {
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, 'requires SUPABASE_SERVICE_ROLE_KEY')

  test('event: insert/delete registrations recalculates available_spots, leaves other events untouched', async () => {
    const baseline = await getAvailableSpots(MALBEC_EVENT_ID)
    const controlBaseline = await getAvailableSpots(CATA_VERTICAL_EVENT_ID)

    // try/finally so a failed assertion mid-test still cleans up its rows —
    // this test hits a real, shared event (MALBEC_EVENT_ID is also used by
    // scanner.spec.ts/host-role.spec.ts fixtures), and a previous run that
    // threw here used to leave dangling registrations behind permanently,
    // which then corrupted every subsequent run's baseline (confirmed: found
    // 2 leftover e2e-spots-integrity@example.com rows from earlier failed
    // runs during this session's audit pass).
    let regA: string | undefined
    let regB: string | undefined
    try {
      regA = await insertRegistration(MALBEC_EVENT_ID, 2)
      expect(await getAvailableSpots(MALBEC_EVENT_ID)).toBe(baseline - 2)

      regB = await insertRegistration(MALBEC_EVENT_ID, 1)
      expect(await getAvailableSpots(MALBEC_EVENT_ID)).toBe(baseline - 3)

      // A completely unrelated event must not move.
      expect(await getAvailableSpots(CATA_VERTICAL_EVENT_ID)).toBe(controlBaseline)
    } finally {
      if (regA) await deleteRegistration(regA)
      if (regB) await deleteRegistration(regB)
    }

    expect(await getAvailableSpots(MALBEC_EVENT_ID)).toBe(baseline)
    expect(await getAvailableSpots(CATA_VERTICAL_EVENT_ID)).toBe(controlBaseline)
  })

  test('course: insert/delete enrollments (registrations) recalculates available_spots', async () => {
    const baseline = await getCourseSpots(SOMMELIER_COURSE_ID)

    let enrollmentId: string | undefined
    try {
      enrollmentId = await insertEnrollment(SOMMELIER_COURSE_ID)
      expect(await getCourseSpots(SOMMELIER_COURSE_ID)).toBe(baseline - 1)
    } finally {
      if (enrollmentId) await deleteEnrollment(enrollmentId)
    }

    expect(await getCourseSpots(SOMMELIER_COURSE_ID)).toBe(baseline)
  })

  // Phase 2 regression coverage: recalculate_event_spots was rewritten to
  // exclude status='dropped' registrations (previously only enrollments had
  // this "dropped frees the spot" behavior, via a separate function/trigger
  // that no longer exists — a naive table merge would have silently dropped
  // this guarantee, permanently locking the seat).
  test('course: a dropped enrollment frees its spot, a completed one does not', async () => {
    const baseline = await getCourseSpots(SOMMELIER_COURSE_ID)

    let enrollmentId: string | undefined
    try {
      enrollmentId = await insertEnrollment(SOMMELIER_COURSE_ID)
      expect(await getCourseSpots(SOMMELIER_COURSE_ID)).toBe(baseline - 1)

      await updateRegistrationStatus(enrollmentId, 'dropped')
      expect(await getCourseSpots(SOMMELIER_COURSE_ID)).toBe(baseline)

      await updateRegistrationStatus(enrollmentId, 'completed')
      expect(await getCourseSpots(SOMMELIER_COURSE_ID)).toBe(baseline - 1)
    } finally {
      if (enrollmentId) await deleteEnrollment(enrollmentId)
    }

    expect(await getCourseSpots(SOMMELIER_COURSE_ID)).toBe(baseline)
  })
})
