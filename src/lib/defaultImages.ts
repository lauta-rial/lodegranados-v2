// Default portal imagery, self-hosted under /public/defaults (same-origin, so
// no CSP/external-host issues). Used as a fallback wherever a branch / event /
// plan has no image_url of its own — set one in the admin and it takes over,
// no DB backfill needed. See public/defaults/*.jpg.
export const DEFAULT_IMAGES = {
  branchHero: '/defaults/branch-hero.jpg',
  cata: '/defaults/cata.jpg',
  curso: '/defaults/curso.jpg',
  plan: '/defaults/plan.jpg',
} as const
