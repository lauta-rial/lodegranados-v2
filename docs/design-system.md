# Design Direction — Lo de Granados v2

> This is a **direction doc**, not a spec. The v1 design was dark glassmorphic. v2 should be a fresh, modern take. Claude Code should design creatively within these principles.

## Principles

### 1. Modern & Premium
A boutique winery from Mendoza should feel elevated, not generic. Think:
- **Editorial / luxury** — whitespace, confident typography, restrained color
- **Warm but not dark** — the v1 forced dark mode. v2 can be light-first or a sophisticated light/dark system
- **Photography-first** — vineyard, wine, tasting room imagery drives the visual hierarchy

### 2. Clean & Fast
- No heavy glassmorphism unless it serves a purpose
- Generous whitespace
- Smooth but quick animations
- Mobile-first, but desktop should feel spacious

### 3. Distinct Identity
- Not a template. The design should feel custom to Lo de Granados.
- Wine culture: terroir, craft, tradition meets modern
- Argentine warmth without clichés

## Visual Direction (starting points, not rules)

**Palette idea:** warm earth + wine — terracotta, deep burgundy, cream, olive. Or go lighter: off-white base, wine accent, natural photography.

**Typography:** one strong display font + one workhorse body font. Serif for headlines could work well for a winery.

**Layout:** editorial grids, asymmetric sections, large photography, generous spacing.

**Interactions:** subtle micro-interactions, smooth page transitions, no heavy effects.

## What to KEEP from v1

- **Page structure**: landing → club → catas → cursos → empresas → faq → auth → admin
- **Four-state handling**: loading, empty, error, success for every data view
- **Responsive patterns**: 1→2→3/4 column grids
- **Mobile sticky CTAs** on detail pages
- **Skeleton loading** instead of spinners
- **Admin panel** with sidebar + content area layout

## What to REDESIGN

- **Everything visual**: colors, typography, spacing, components, animations
- **Glassmorphism**: remove or significantly reduce. Let the content breathe.
- **Dark mode**: don't force it. Light-first or proper light/dark toggle.
- **Card design**: simpler, cleaner. Less "tech", more "wine".
- **Hero**: big photography, minimal overlay, strong typography.

## Inspiration

- Winery websites: Ridge Vineyards, Domaine de la Romanée-Conti, Catena Zapata
- Modern SaaS with warmth: Linear, Raycast, Vercel
- Editorial: Kinfolk, Cereal Magazine

## Technical

- React 19 + Vite + Tailwind v4
- Tailwind config should define the design token system
- All colors, spacing, typography from tokens — no magic values
- Custom fonts via Google Fonts or similar

---

**Important for Claude Code:** This doc describes *direction*, not exact values. Use your design judgment. The goal is a premium, modern, distinctive winery site — not a copy of v1.
