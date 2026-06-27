# CLAUDE.md — Lo de Granados v2

## Project

Boutique winery web app for Lo de Granados (Mendoza, Argentina). Public site for browsing wine tastings (catas), courses (cursos), and wine club subscriptions (Club DeVinos). Admin panel for managing events, courses, plans, subscriptions, registrations, and corporate inquiries.

- **Production v1:** https://lodegranado.vercel.app
- **API v1:** https://api.34.239.137.66.nip.io
- **Old repo:** lauta-rial/lodegranados-fe (React+NestJS+SQLite)
- **This is a from-scratch rebuild using MCPs**

## Stack (v2)

| Layer | Technology | MCP |
|-------|-----------|-----|
| Frontend | React 19 + Vite + Tailwind v4 | Vercel MCP |
| Backend / DB | Supabase (Postgres + Auth + Storage) | Supabase MCP |
| Payments | MercadoPago (PreApproval + Preference) | MercadoPago MCP |
| Email | Resend | — |
| Repo | GitHub | GitHub MCP |
| Dev | Claude Code (you) | — |

## Key Decisions

1. **Supabase replaces NestJS + SQLite** — auth, DB, storage, all managed. No more custom JWT, no more SQLite limits.
2. **Row-Level Security** — auth comes out of the box. Branch admins see only their branch's data.
3. **MCPs everywhere** — Claude Code talks directly to Supabase, MercadoPago, Vercel via MCP. No wrappers.
4. **DB-first deletion** — never filter on the frontend. Delete from DB, refetch.
5. **Breadcrumb eliminated from all pages** — do NOT add breadcrumbs.

## MCP Servers

Configured in `.mcp.json` at project root. Claude Code auto-loads them.

Available tools from each MCP:
- **Supabase MCP**: `supabase_list_tables`, `supabase_apply_migration`, `supabase_execute_sql`, `supabase_list_projects`, `supabase_manage_auth`
- **MercadoPago MCP**: `mercadopago_create_preference`, `mercadopago_create_preapproval`, `mercadopago_get_payment`
- **Vercel MCP**: `vercel_deploy`, `vercel_list_projects`, `vercel_get_domain`
- **GitHub MCP**: `github_create_pr`, `github_push`, `github_search_code`

## Pages to Build (by priority)

### P0 — Critical Path
- `/` — Landing (hero, experience cards, newsletter)
- `/club` — Wine club plans listing
- `/club/:plan` — Plan detail + CTA
- `/catas` — Event listing (paginated, branch filter)
- `/catas/:id` — Event detail + reservation CTA
- `/cursos` — Course listing
- `/cursos/:id` — Course detail + enrollment CTA
- `/login`, `/register`, `/forgot-password`, `/reset-password`
- `/admin/*` — Admin panel (dashboard, CRUD for events, courses, plans, subscriptions, registrations, inquiries)

### P1 — Important
- `/empresas` — Corporate inquiry form + WhatsApp contact
- `/faq` — Accordion FAQ (4 categories)
- `/checkout` — Payment flow (redirects to MercadoPago)

## Design Conventions

- **Glass panels** with dark gradient overlays
- **Warm palette** (wine reds, golds, dark greens)
- **Tailwind v4** with custom theme
- **Responsive**: 1 col (mobile) → 2 cols (tablet) → 4 cols (desktop) for card grids
- **Skeleton loading states** for all data fetching
- **Staggered fade-in animations** on cards
- **Sticky CTA bar** on mobile detail pages

## DB Schema

14 tables to migrate from SQLite to Supabase Postgres. See `docs/db-schema.md`.

Key tables:
- `users` — auth users (Supabase handles this)
- `branches` — sucursales
- `plans` — Club DeVinos plans (name, emoji, price, features[], highlighted)
- `subscriptions` — user subscriptions to plans
- `events` — cata events (title, date, time, location, spots, price)
- `courses` — wine courses (title, instructor, syllabus[], classes, price)
- `registrations` — event registrations
- `enrollments` — course enrollments
- `inquiries` — corporate contact form submissions
- `newsletter` — newsletter subscribers

Full schema with column types, relationships, and indexes in `docs/db-schema.md`.

## Auth Flow

1. User signs up/logs in via Supabase Auth (email/password + Google OAuth)
2. JWT from Supabase stored in localStorage
3. Supabase RLS enforces branch scoping
4. Admin role checked via `user_metadata.role`

## Payment Flow

1. User clicks CTA → MercadoPago Preference created via MCP
2. User redirected to MercadoPago checkout
3. Webhook notifies backend of payment status
4. Subscription/registration created in DB

## v1 Lessons (do NOT repeat)

1. `useAuth().user` is the email string, not an object. Use `user || ''`.
2. TypeORM `enum` type doesn't work with SQLite → use `simple-enum` in entities. (Irrelevant in v2 — Postgres handles enums natively.)
3. MercadoPago sandbox: cardholder name must be `APRO` for approved payment.
4. Never pass bcrypt hashes through shell — use Python script or Supabase Auth directly.
5. CORS only allows production domain, not Vercel preview URLs.
6. Checkout page is orphaned in v1 — catas and cursos go directly to MercadoPago, not through `/checkout`.
7. Breadcrumb `max-w` must match content container or left edges misalign.
8. Build warning: `tsc --noEmit` passes unused vars that `tsc -b` catches → always verify with `npm run build` before pushing.

## Workflow

1. Read `docs/user-stories.md` for the full feature spec
2. Read `docs/db-schema.md` for the DB design
3. Read `docs/design-system.md` for ALL visual design — colors, components, page layouts, CSS snippets. **Every component has exact CSS here — use it directly.**
4. Start with Supabase: create schema migrations, set up auth
5. Build frontend page by page, priority order, matching the design system exactly
6. Each page: connect to Supabase via MCP, add loading/empty/error states
7. Add MercadoPago integration last
8. Deploy to Vercel via MCP

## Testing

- All pages need: loading state, empty state, error state, success state
- MercadoPago: test with sandbox credentials + `APRO` cardholder
- Auth: test Supabase email/password + Google OAuth
- Mobile: test all pages at 375px width
