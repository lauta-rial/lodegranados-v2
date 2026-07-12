// Default portal imagery, self-hosted under /public/defaults (same-origin, so
// no CSP/external-host issues). Used as a fallback wherever a branch / event /
// plan has no image_url of its own — set one in the admin and it takes over,
// no DB backfill needed. See public/defaults/*.jpg.
export const DEFAULT_IMAGES = {
  branchHero: '/defaults/branch-hero.jpg',
  cata: '/defaults/cata.jpg',
  curso: '/defaults/curso.jpg',
  plan: '/defaults/plan.jpg',
  // Fixed imagery for the three branch-home "experience" cards.
  expCatas: '/defaults/exp-catas.jpg',
  expCursos: '/defaults/exp-cursos.jpg',
  expClub: '/defaults/exp-club.jpg',
} as const

// A pool of distinct wine photos per entity kind, so a listing of
// catas/cursos/planes without their own image_url doesn't repeat the same
// photo. Every image here is a hand-checked, visually-distinct wine shot; some
// are reused across pools (a cata and a plan can share one — they never appear
// on the same page). The pick is by list position (below), not random, so it's
// stable across reloads.
const POOLS = {
  cata: ['/defaults/cata.jpg', '/defaults/cata-3.jpg', '/defaults/curso-2.jpg', '/defaults/plan-4.jpg'],
  curso: ['/defaults/curso-3.jpg', '/defaults/curso-4.jpg', '/defaults/curso.jpg', '/defaults/cata-3.jpg'],
  // plan.jpg and plan-3.jpg are both a French bottle + glass on white — nearly
  // identical, so keep them apart: slots 0/1 (the only two the 2-plan Club page
  // ever shows) are the most visually distinct of the set.
  plan: ['/defaults/plan.jpg', '/defaults/plan-4.jpg', '/defaults/curso-2.jpg', '/defaults/plan-3.jpg'],
} as const

// Small stable string hash (djb2-ish) so the same id always maps to the same
// pool slot when no list position is available (e.g. a detail page).
function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

// Fallback image for a row with no image_url. In a listing pass the row's
// `index` — the pool is walked in order so the first N rows are all distinct
// (no hash collisions). On a standalone detail page omit index and it falls
// back to an id-hashed pick (stable per row).
export function defaultImageFor(
  kind: keyof typeof POOLS,
  id: string | null | undefined,
  index?: number,
): string {
  const pool = POOLS[kind]
  if (typeof index === 'number') return pool[index % pool.length]
  if (!id) return pool[0]
  return pool[hashId(id) % pool.length]
}
