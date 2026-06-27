# User Stories — Lo de Granados

Source of truth. Priority: **P0** = must have, **P1** = should have, **P2** = nice to have.

## 1. Landing Page (P0)

- **US-1.1 Hero**: Vineyard image + dark gradient, tagline, headline "Hola de Leo", descriptive paragraph, responsive (420px mobile / 520px desktop)
- **US-1.2 Experience Cards**: 4 cards (Club DeVinos, Catas, Capacitaciones, Empresas), each with image, tag, title, description, CTA link. Responsive: 1→2→4 cols
- **US-1.3 Featured Event Card**: Self-fetching card between Hero and CardGrid showing next upcoming event

## 2. Wine Club — Club DeVinos (P0)

- **US-2.1 Plan Listing**: /club, fetches plans, grid with emoji+name+price+features+badge. Skeleton loading, empty state, error state.
- **US-2.2 Plan Detail**: /club/:plan (by slug), hero image, glass panel, feature checkmarks, "Suscribirse" CTA
- **US-2.3 Subscribe**: Guest → redirect /login?redirect=/club/:plan. Member → /checkout?plan=:slug

## 3. Catas — Wine Tastings (P0)

- **US-3.1 Event Listing**: /catas, paginated (12/page), day badge+month+time+title+location+price+spots. Branch filter dropdown. Spots: 0="Agotado" (red), ≤3="Últimos N" (amber), >3="N cupos" (green)
- **US-3.2 Event Detail**: /catas/:id, hero+gradient, glass panel with date/time/location/description/spots/price/CTA. Mobile sticky CTA bar. CTA adapts: sold out=disabled, available=price
- **US-3.3 Branch Filtering**: Dropdown appears when >1 branches, resets page to 1 on change

## 4. Cursos — Courses (P0)

- **US-4.1 Course Listing**: /cursos, paginated, class count+start date+schedule+title+description+instructor+spots+price. Branch filter. Spots: 0="Completo" (red), ≤5="Últimos N" (amber)
- **US-4.2 Course Detail**: /cursos/:id, hero+greenish gradient, glass panel with instructor card (avatar+name+bio), syllabus list (numbered), price, spots, CTA
- **US-4.3 Branch Filtering**: Same as catas dropdown pattern

## 5. Empresas — Corporate (P1)

- **US-5.1 Inquiry Form**: /empresas, form (name, email, message required), submit to POST /empresas/inquiry. Success state, error state.
- **US-5.2 WhatsApp Contact**: Link to wa.me/:number, opens new tab

## 6. FAQ (P1)

- **US-6.1 Accordion**: /faq, 4 categories (🍷 Club, 🥂 Catas/Cursos, 📦 Envíos/Pagos, 📍 Ubicación), 3-4 Qs each, smooth expand/collapse, chevron rotate, staggered fade-in

## 7. Auth (P0)

- **US-7.1 Login**: Email+password form, glass panel, redirect support, error/loading states
- **US-7.2 Register**: Name+email+password+confirm, min 6 chars, client-side validation
- **US-7.3 Google OAuth**: "Continuar con Google" button, Supabase handles flow
- **US-7.4 Forgot Password**: Email form, sends reset link (Resend), success state
- **US-7.5 Reset Password**: Token validation, new password form, auto-redirect to /login?reset=success
- **US-7.6 Logout**: Clear localStorage, auth context update

## 8. Admin Panel (P0)

- **US-8.1 Admin Login**: /admin/login, card form, Google OAuth support, auto-redirect if authenticated
- **US-8.2 Dashboard**: KPI cards (events, subscriptions, courses, inquiries, registrations, enrollments), bar charts, recent activity tables. Branch scoping for regular admins.
- **US-8.3 Events CRUD**: /admin/catas, two tabs (Events + Registrations). Paginated, search, date filter. Create/edit/delete events. Add/edit/delete registrations with attendance toggle.
- **US-8.4 Courses CRUD**: /admin/cursos, two tabs (Courses + Enrollments). Create/edit/delete courses. Add/edit/delete enrollments with status toggle (enrolled→completed→dropped).
- **US-8.5 Club Manager**: /admin/club, two tabs (Plans + Subscriptions). Plan CRUD. Subscription management with status filter, search.
- **US-8.6 Inquiries Manager**: /admin/inquiries, paginated, status filter (new/read/archived)

## 9. Checkout (P1)

- **US-9.1 Payment Flow**: CTA click → MercadoPago Preference via MCP → redirect to MP → webhook → DB update
- **US-9.2 Pricing Display**: Plan price, event price, course price shown in ARS

## 10. Newsletter (P2)

- **US-10.1 Signup**: Email input + subscribe button on landing page, POST /newsletter, success/error states
