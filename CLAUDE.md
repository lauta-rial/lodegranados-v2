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

**v2 is a fresh redesign — do NOT copy v1.** See `docs/design-system.md` for direction.

Key rules:
- Modern, premium, warm. Editorial layout. Photography-first.
- Light-first or proper light/dark toggle. No forced dark mode.
- Glassmorphism removed or minimal. Content should breathe.
- Four-state handling on every data view: loading (skeletons), empty, error, success
- Responsive: 1→2→3/4 col grids
- Mobile sticky CTA bar on detail pages
- All colors/spacing/typography from Tailwind tokens, no magic values

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

1. `useAuth().user` is email string, not object. Use `user || ''`.
2. DB-first deletion: delete from DB, refetch, never filter frontend.
3. MercadoPago sandbox: cardholder `APRO` for approved payment.
4. Breadcrumb eliminated from all pages — do NOT add breadcrumbs.
5. Checkout page is orphaned — catas/cursos go directly to MercadoPago, not through /checkout.
6. CORS only allows production domain, not Vercel preview URLs.
7. Always verify build with `npm run build` before push.
8. `tsc --noEmit` is unreliable — always use `npm run build` for build verification.

## Workflow

1. Read `docs/user-stories.md` for the full feature spec
2. Read `docs/db-schema.md` for the DB design
3. Read `docs/design-system.md` for design *direction* and principles — then design fresh
4. Start with Supabase: create schema migrations, set up auth
5. Build frontend page by page, priority order
6. Each page: connect to Supabase via MCP, add loading/empty/error states
7. Add MercadoPago integration last
8. Deploy to Vercel via MCP

## Testing

- All pages need: loading state, empty state, error state, success state
- MercadoPago: test with sandbox credentials + `APRO` cardholder
- Auth: test Supabase email/password + Google OAuth
- Mobile: test all pages at 375px width
