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

// A pool per entity kind so a page full of catas/cursos/planes without their
// own image_url doesn't repeat the same photo N times. The pick is keyed off
// the row id (below), so a given cata always shows the same image — stable
// across reloads and pagination, just varied across rows.
const POOLS = {
  cata: ['/defaults/cata.jpg', '/defaults/cata-2.jpg', '/defaults/cata-3.jpg', '/defaults/cata-4.jpg'],
  curso: ['/defaults/curso.jpg', '/defaults/curso-2.jpg', '/defaults/curso-3.jpg', '/defaults/curso-4.jpg'],
  plan: ['/defaults/plan.jpg', '/defaults/plan-2.jpg', '/defaults/plan-3.jpg', '/defaults/plan-4.jpg'],
} as const

// Small stable string hash (djb2-ish) so the same id always maps to the same
// pool slot — no Math.random (would reshuffle every render).
function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

// Fallback image for a row with no image_url — deterministic by id so it's
// stable per row but varied across a listing. Pass the row's id.
export function defaultImageFor(kind: keyof typeof POOLS, id: string | null | undefined): string {
  const pool = POOLS[kind]
  if (!id) return pool[0]
  return pool[hashId(id) % pool.length]
}
