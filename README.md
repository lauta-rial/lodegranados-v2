# Lo de Granados v2 — MCP Rebuild 🍷

Winery boutique web app (Mendoza, Argentina). Rebuilt from scratch using **Claude Code + MCPs** (Model Context Protocol).

- **v1 (running):** https://lodegranado.vercel.app
- **v1 API:** https://api.34.239.137.66.nip.io
- **v1 Stack:** React + NestJS + SQLite + MercadoPago
- **v2 Stack:** React + Supabase + MercadoPago + Vercel, all via MCPs

---

## Quick Start (Local Machine)

### 1. Clone

```bash
git clone https://github.com/lauta-rial/lodegranados-v2.git
cd lodegranados-v2
```

### 2. Set up MCP credentials

```bash
cp .mcp.example.json .mcp.json
# Edit .mcp.json with your real tokens
```

### 3. Set up services

| # | Service | Action |
|---|---------|--------|
| 1 | **Supabase** | Go to [supabase.com](https://supabase.com) → Create project → Copy Project ID + Access Token |
| 2 | **MercadoPago** | Get production access token from [MercadoPago Dashboard](https://www.mercadopago.com.ar/developers/panel) |
| 3 | **Vercel** | Get token from [Vercel Dashboard → Settings → Tokens](https://vercel.com/account/tokens) |
| 4 | **GitHub** | Use your existing token or create one at [GitHub → Settings → Tokens](https://github.com/settings/tokens) |

### 4. Launch Claude Code

```bash
claude
```

Claude Code auto-reads `CLAUDE.md` and `.mcp.json`. It will have access to all MCP tools immediately.

### 5. First tasks (tell Claude)

```
1. Create the Supabase DB schema from docs/db-schema.md
2. Set up Supabase Auth (email/password + Google OAuth)
3. Scaffold the React + Vite + Tailwind frontend
4. Deploy to Vercel
```

---

## Project Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Main instruction file — read by Claude Code on startup |
| `.mcp.json` | MCP server config (your tokens) — **git-ignored** |
| `.mcp.example.json` | Template for `.mcp.json` |
| `docs/db-schema.md` | Full database design (14 tables, RLS policies) |
| `docs/user-stories.md` | All features with acceptance criteria (P0/P1/P2) |
| `docs/design-system.md` | Design **direction** — principles, inspiration, what to redesign. Claude Code designs fresh within these guidelines. |

---

## Stack

| Layer | v1 | → v2 |
|-------|-----|------|
| Frontend | React 19 + Vite + Tailwind v4 | → Same, via Vercel MCP |
| Backend/DB | NestJS + TypeORM + SQLite | → **Supabase Postgres** + Auth + Storage |
| Auth | Custom JWT + Google OAuth | → **Supabase Auth** |
| Payments | MercadoPago API | → **MercadoPago MCP** |
| Email | Resend | → Resend (keep) |
| Deploy | Docker + scp + Vercel CLI | → **Vercel MCP** |
| Dev | Manual + Swarm | → **Claude Code** |

---

## Pages

| Page | Priority | URL |
|------|----------|-----|
| Landing | P0 | `/` |
| Club DeVinos Plans | P0 | `/club` |
| Plan Detail | P0 | `/club/:plan` |
| Catas Listing | P0 | `/catas` |
| Cata Detail | P0 | `/catas/:id` |
| Cursos Listing | P0 | `/cursos` |
| Curso Detail | P0 | `/cursos/:id` |
| Login / Register | P0 | `/login`, `/register` |
| Forgot/Reset Password | P0 | `/forgot-password`, `/reset-password` |
| Admin Panel | P0 | `/admin/*` |
| Empresas | P1 | `/empresas` |
| FAQ | P1 | `/faq` |
| Checkout | P1 | `/checkout` |

---

## Design (v2)

**Fresh redesign — not a copy of v1.** See `docs/design-system.md` for direction.

- Modern, premium, editorial. Photography-first.
- Warm palette, confident typography. Light-first or light/dark toggle.
- No forced glassmorphism. Content should breathe.
- Four-state handling: loading (skeletons), empty, error, success
- Responsive: 1→2→3/4 col grids

## v1 Lessons (do NOT repeat)

1. `useAuth().user` is email string, not object
2. DB-first deletion: delete from DB, refetch — never filter on frontend
3. MercadoPago sandbox: cardholder `APRO` for approved payment
4. Breadcrumb eliminated — do NOT add
5. Checkout page is orphaned — catas/cursos go directly to MP
6. CORS only allows production domain
7. Always `npm run build` before push (tsc --noEmit unreliable)

<!-- dev deploy trigger -->
