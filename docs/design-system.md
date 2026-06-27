# Design System — Lo de Granados

Dark glassmorphic "Digital Cellar" aesthetic. Every page uses these tokens and components.

---

## 🎨 Color Tokens (Tailwind v4 `@theme`)

```css
@theme {
  /* Background & Surfaces */
  --color-brand-bg: #141311;
  --color-brand-bg-alt: #1c1c19;
  --color-brand-surface: #20201d;
  --color-brand-surface-high: #2b2a28;
  --color-brand-surface-highest: #353532;

  /* Text */
  --color-brand-text: #e5e2de;
  --color-brand-text-secondary: #dbc1b5;
  --color-brand-text-muted: #a38c81;

  /* Primary — peachy terracotta */
  --color-brand-primary: #ffb68f;
  --color-brand-primary-hover: #ffdbca;
  --color-brand-primary-light: rgba(255, 182, 143, 0.12);
  --color-brand-primary-container: #d8773e;
  --color-brand-on-primary: #542100;

  /* Secondary — muted rose */
  --color-brand-secondary: #d9c1c0;
  --color-brand-secondary-light: rgba(217, 193, 192, 0.12);

  /* Gold (mapped to primary) */
  --color-brand-gold: #ffb68f;
  --color-brand-gold-light: rgba(255, 182, 143, 0.12);

  /* Glass */
  --color-glass-fill: rgba(255, 255, 255, 0.08);
  --color-glass-stroke: rgba(255, 255, 255, 0.12);
  --color-glass-fill-hover: rgba(255, 255, 255, 0.12);
  --color-inner-glow: rgba(255, 255, 255, 0.05);

  /* Borders */
  --color-brand-border: rgba(255, 255, 255, 0.08);
  --color-brand-border-strong: rgba(255, 255, 255, 0.12);

  /* Tertiary — cyan accent */
  --color-brand-tertiary: #63d5f0;

  /* Font */
  --font-family-body: 'DM Sans', system-ui, -apple-system, sans-serif;
  --font-family-display: 'DM Sans', system-ui, -apple-system, sans-serif;
}
```

## 🏗️ Base Styles

```css
body {
  overflow-x: hidden;
  font-family: var(--font-family-body);
  color: var(--color-brand-text);
  background-color: var(--color-brand-bg);
  background-image: radial-gradient(circle at 50% 0%, rgba(212, 116, 59, 0.15) 0%, transparent 60%);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}
```

Key: dark background `#141311` with a **terracotta radial gradient at the top center** fading to transparent.

---

## 🧩 Component Library

### Glass Panel (`.glass-panel`)
Used for: login/register forms, plan detail sections, checkout card, admin forms.

```css
.glass-panel {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05);
}

.glass-panel:hover {
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.05);
}
```

### Card (`.card`)
Used for: experience cards, plan cards, event/course cards in grids.

```css
.card {
  position: relative;
  z-index: 0;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05);
  border-radius: 0.75rem;  /* rounded-xl */
  transition: transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
}

.card:hover {
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transform: translateY(-2px);
}
```

### Text Glow (`.text-glow`)
Used for: hero headlines ("Hola de Leo").

```css
.text-glow {
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
}
```

### Hero Overlay (`.hero-overlay`)
Used for: DetailHero on cata/course/plan detail pages. Image background with dark gradient.

```css
.hero-overlay {
  position: relative;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-overlay-content {
  position: relative;
  z-index: 2;
  padding: 2rem 1rem;
  color: #e5e2de;
  width: 100%;
}
```

Hero images use dark gradient overlays via CSS `background: linear-gradient(...)` or Tailwind gradient classes.

### Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.badge-gold   { background: rgba(255,182,143,0.15); color: #ffb68f; border: 1px solid rgba(255,182,143,0.25); }
.badge-green  { background: rgba(99,213,240,0.12);  color: #63d5f0; border: 1px solid rgba(99,213,240,0.2);  }
.badge-amber  { background: rgba(255,182,143,0.1);   color: #ffb68f; border: 1px solid rgba(255,182,143,0.15); }
.badge-red    { background: rgba(255,180,171,0.12);  color: #ffb4ab; border: 1px solid rgba(255,180,171,0.2);  }
.badge-purple { background: rgba(217,193,192,0.12);  color: #d9c1c0; border: 1px solid rgba(217,193,192,0.2);  }
```

### Section Label (`.section-label`)
Used for: section headers ("EXPERIENCIAS", "CLUB DE VINOS", etc).

```css
.section-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-brand-primary);
  margin-bottom: 0.5rem;
}
```

### Buttons

```css
.btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  min-height: 44px;
  background: var(--color-brand-primary-container); /* #d8773e */
  color: #ffffff;
  font-weight: 600;
  padding: 0.75rem 1.75rem;
  border-radius: 0.75rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary:hover {
  background: #bf6935;
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(216,119,62,0.35);
}

.btn-outline {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  min-height: 44px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.12);
  color: var(--color-brand-text);
  font-weight: 500;
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-outline:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.2);
}

.btn-ghost {
  background: transparent; border: none;
  color: var(--color-brand-text-secondary);
  font-weight: 500;
  padding: 0.5rem 1rem;
  min-height: 44px;
  border-radius: 0.5rem;
  cursor: pointer;
}
.btn-ghost:hover {
  background: rgba(255,255,255,0.06);
  color: var(--color-brand-primary);
}
```

### Tab Pill (`.tab-pill`)
Used for: admin panel tabs (Events/Registrations, Plans/Subscriptions).

```css
.tab-pill {
  display: inline-flex;
  background: rgba(255,255,255,0.06);
  border-radius: 9999px;
  padding: 0.25rem;
  border: 1px solid rgba(255,255,255,0.08);
}
.tab-pill button {
  padding: 0.5rem 1.25rem;
  border-radius: 9999px;
  border: none;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  background: transparent;
  color: var(--color-brand-text-muted);
  transition: all 0.2s;
}
.tab-pill button.active {
  background: rgba(255,255,255,0.12);
  color: var(--color-brand-text);
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
```

### Form Inputs (dark)

```css
input[type="text"], input[type="email"], input[type="password"],
input[type="number"], input[type="search"], textarea, select {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  color: var(--color-brand-text);
  transition: border-color 0.2s, box-shadow 0.2s;
}
input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: var(--color-brand-primary);
  box-shadow: 0 0 0 3px rgba(255,182,143,0.15);
}
input::placeholder, textarea::placeholder {
  color: var(--color-brand-text-muted);
  opacity: 0.6;
}
```

### Skeleton Loading

Cards use skeleton pulse animation. Pattern: 3-6 skeleton cards shown while loading, matching the grid layout.

### Staggered Fade-In

Cards animate in with staggered delays. Pattern:
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
/* nth-child delays: 0ms, 100ms, 200ms, 300ms... */
```

---

## 📄 Page Layouts

### Landing Page (`/`)
```
┌─────────────────────────────────┐
│ Navbar (logo + Login CTA)       │
├─────────────────────────────────┤
│ Hero Section                    │
│ - Full-bleed vineyard image     │
│ - Dark gradient overlay         │
│ - Tagline: "BODEGA BOUTIQUE"    │
│ - Headline: "Hola de Leo"       │
│   with text-glow                │
│ - Descriptive paragraph         │
│ - min-h: 420px mobile           │
│   520px desktop                 │
├─────────────────────────────────┤
│ FeaturedEventCard               │
│ - Auto-fetches next event       │
│ - Glass card between Hero+Grid  │
├─────────────────────────────────┤
│ Experience Cards Grid           │
│ - 4 cards: Club, Catas,         │
│   Capacitaciones, Empresas      │
│ - 1→2→4 col responsive          │
│ - Each: image, tag, title,      │
│   description, CTA link         │
│ - Club card: dynamic price tag  │
├─────────────────────────────────┤
│ Newsletter Signup               │
│ - Email input + subscribe btn   │
├─────────────────────────────────┤
│ Footer                          │
└─────────────────────────────────┘
```

### Plan Listing (`/club`)
```
┌─────────────────────────────────┐
│ SectionHeader                   │
│ label: "CLUB DE VINOS"          │
│ title: "Planes"                 │
├─────────────────────────────────┤
│ Plan Cards Grid                 │
│ - 1→2→3 col responsive          │
│ - Each card: emoji, name,       │
│   price, features list, badge   │
│ - Highlighted: warmer gradient  │
│ - Skeleton: 3 pulse cards       │
│ - Empty: "No hay planes"        │
├─────────────────────────────────┤
│ "Podés cancelar en cualquier    │
│  momento" disclaimer            │
│ Footer link → /empresas         │
└─────────────────────────────────┘
```

### Cata/Event Detail (`/catas/:id`)
```
┌─────────────────────────────────┐
│ DetailHero                      │
│ - Hero image + dark gradient    │
│ - Glass panel overlay:          │
│   date+time badge, title,       │
│   location (map pin icon),      │
│   description, spots badge,     │
│   price, CTA button             │
│ - CTA: "Agotado" (disabled)     │
│   or "Comprar entrada — $N"     │
├─────────────────────────────────┤
│ (Mobile) Sticky CTA bar         │
│  fixed at bottom                │
└─────────────────────────────────┘
```

### Admin Panel (`/admin/*`)
```
┌─────────────────────────────────┐
│ AdminTopBar (user menu, logout)  │
├──────────┬──────────────────────┤
│ Sidebar  │ Content Area         │
│ - Dash   │ - KPIs (dashboard)   │
│ - Catas  │ - DataTable (list)   │
│ - Cursos │ - TabPill (tabs)     │
│ - Club   │ - Forms (create/edit) │
│ - Empr.  │ - BranchSelector     │
│          │ - Pagination         │
└──────────┴──────────────────────┘
```

### Auth Pages (`/login`, `/register`)
```
┌─────────────────────────────────┐
│ Centered glass-panel card       │
│ - Form fields (dark inputs)     │
│ - Submit button (btn-primary)   │
│ - "Continuar con Google" button │
│ - Links: login↔register,        │
│   forgot password               │
│ - Loading: "Cargando..."        │
│ - Error: inline message         │
└─────────────────────────────────┘
```

---

## 🔤 Typography

- **Font**: DM Sans only (300, 400, 500, 600, 700 weights)
- **Headings**: DM Sans, `font-weight: 600-700`
- **Body**: DM Sans, `font-weight: 400`
- **Labels/Small**: DM Sans, `font-weight: 600`, uppercase, tracking-wide
- **Font loading**: Google Fonts `DM Sans:opsz,wght@9..40,100..1000`

---

## 📱 Responsive Breakpoints

| Breakpoint | Columns |
|-----------|---------|
| Mobile (<768px) | 1 column |
| Tablet (768px) | 2 columns |
| Desktop (1024px+) | 3-4 columns |

Card grids always follow 1→2→3/4 pattern. Forms are max-w-md centered. Detail pages are max-w-5xl (matches breadcrumb).

---

## 🔗 Reference

- **Live v1**: https://lodegranado.vercel.app
- **v1 Repo**: lauta-rial/lodegranados-fe (frontend/)
- **v1 CLAUDE.md**: `/tmp/lodegranados-fe/frontend/CLAUDE.md`
- **v1 CSS**: `/tmp/lodegranados-fe/frontend/src/index.css`
