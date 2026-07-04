# Architecture Diagrams — Lo de Granados v2

Actualizado 2026-07-04 tras la unificación catas/cursos (Fases 1-4) y la auditoría de seguridad del mismo día. Antes había 6 diagramas, incluyendo uno de "flujo de autenticación" genérico (JWT + refresh token) que no describía nada específico de este proyecto — se sacó. Los 4 que quedan cubren lo que realmente importa: arquitectura, rutas/permisos, el modelo de roles (ahora con `host`), y el flujo de pago (el más crítico, y el que más cambió).

## 1. Arquitectura general

```mermaid
graph TB
    subgraph Vercel["☁️ Vercel"]
        React["React 19 + Vite\nTanStack Query · React Router"]
    end

    subgraph Supabase["🔷 Supabase"]
        Auth["Auth\nJWT + RLS"]
        DB["Postgres\nevents(kind) · event_sessions · registrations\ntickets(session_id) · event_hosts"]
        Storage["Storage\nbucket: media"]
        EF1["Edge Fn\ncreate-mp-preference"]
        EF2["Edge Fn\nmp-webhook"]
        EF3["Edge Fn\nsend-email"]
        EF4["Edge Fn\nmanage-staff / assign-host"]
    end

    MP["💳 MercadoPago"]
    Resend["📧 Resend"]
    User["👤 Usuario"]
    Admin["🔑 Admin / Host"]

    User --> React
    Admin --> React
    React --> Auth
    React --> DB
    React --> Storage
    React -->|"POST (precio verificado server-side)"| EF1
    EF1 --> MP
    MP -->|"webhook firmado\n(HMAC-SHA256)"| EF2
    EF2 -->|"re-verifica pago contra MP"| EF3
    EF3 --> DB
    EF3 --> Resend
    Resend -->|"email confirmación"| User
    Admin -->|"alta/revocación de staff"| EF4
    EF4 --> Resend
```

---

## 2. Mapa de rutas y permisos

`catas` y `cursos` son la misma tabla `events` (columna `kind`) desde la unificación — dos rutas públicas distintas, un solo CRUD de admin (`EventsTab.tsx`/`RegistrationsTab.tsx`, parametrizado por `kind`).

```mermaid
graph LR
    subgraph PUB["🌐 Público — sin login"]
        A["/"] --> B["/:branch"]
        B --> C["/:branch/catas/:id"]
        B --> E["/:branch/cursos/:id"]
        B --> G["/:branch/club/:planId"]
        B --> I["/:branch/empresas"]
        B --> J["/:branch/faq"]
        K["/login · /register · /forgot-password"]
    end

    subgraph AUTH["🔐 Usuario autenticado"]
        N["/mi-cuenta\n(reservas + cursos + QR)"]
        O["/pago-exitoso · /pago-fallido · /pago-pendiente"]
    end

    subgraph ADMIN["🔑 Admin/Superadmin"]
        R["/admin\n(dashboard)"]
        R --> S["/admin/catas · /admin/cursos\n(EventsTab + RegistrationsTab, kind-aware)"]
        R --> U["/admin/club"]
        R --> V["/admin/consultas · /admin/newsletter"]
        R --> X["/admin/sucursales\n⚠️ solo superadmin"]
        R --> Y["/admin/staff\n⚠️ solo superadmin — CRUD admin/host"]
        S --> Z["/admin/catas/:eventId/live\n(escaneo QR por sesión)"]
    end

    subgraph HOST["🎤 Host — solo eventos asignados"]
        Z2["/admin/catas/:eventId/live\n(mismo componente, scope propio vía event_hosts)"]
    end
```

---

## 3. Modelo de roles

```mermaid
graph TB
    JWT["JWT del usuario\n(Supabase Auth)"] --> AM["app_metadata\n(solo editable por service role)"]
    AM --> ROLE["role: superadmin | admin | host | (sin rol = usuario normal)"]
    AM --> BID["branch_id: uuid | null"]

    ROLE -->|"superadmin"| SUPER["🌍 Ve TODAS las sucursales\nÚnico que gestiona Sucursales y Staff"]
    ROLE -->|"admin"| BRANCH["🏠 Ve solo su sucursal\n(branch_id no-null)"]
    ROLE -->|"host"| HOSTR["🎤 Sin sucursal propia\nVe solo los eventos que le asignaron\n(vía event_hosts, RLS mínima: SELECT+UPDATE en tickets/sesiones)"]

    SUPER & BRANCH --> POL["RLS: app_metadata->>role IN (admin,superadmin)\nAND (branch_id IS NULL OR branch_id = fila.branch_id)"]
    HOSTR --> POL2["RLS: app_metadata->>role = 'host'\nAND EXISTS (SELECT 1 FROM event_hosts WHERE user_id = auth.uid())"]
```

Altas de `admin`/`host` se hacen desde `/admin/staff` (`manage-staff`, superadmin-only) — dispara mail de confirmación de cuenta + mail de bienvenida. La asignación de un host a un evento puntual es aparte (`assign-host`, admin/superadmin de esa sucursal) y dispara un mail de aviso.

---

## 4. Flujo de pago completo

El paso más importante de este diagrama: `send-email` **no confía en que el pago se aprobó** solo porque lo llamaron — vuelve a verificar contra la API real de MercadoPago antes de escribir nada (`registrations`/`subscriptions`/tickets). Antes del 2026-07-04, esto no pasaba y era explotable con la anon key pública.

```mermaid
sequenceDiagram
    actor U as Usuario
    participant R as React
    participant EF1 as create-mp-preference
    participant MP as MercadoPago
    participant EF2 as mp-webhook
    participant EF3 as send-email
    participant DB as Postgres
    participant RS as Resend

    U->>R: Click CTA (Reservar / Inscribirse / Suscribirse)
    R->>EF1: POST {type, id, branchSlug, qty}
    EF1->>DB: Lee precio real de events/plans (ignora precio del cliente)
    EF1->>DB: INSERT pending_checkouts
    EF1->>MP: Create preference
    MP-->>EF1: init_point URL
    EF1-->>R: { url }
    R->>MP: redirect → checkout de MP

    U->>MP: Completa pago con tarjeta
    MP-->>U: Redirect → /pago-exitoso (dispara send-email directo con paymentId)
    MP->>EF2: POST webhook (signed HMAC-SHA256)
    EF2->>EF2: Valida firma
    EF2->>EF3: POST {type, paymentId} — puede ganar la carrera contra el cliente

    Note over EF3: paymentId ⇒ verifyApprovedPayment()
    EF3->>MP: GET /v1/payments/{paymentId}
    MP-->>EF3: status, external_reference
    EF3->>DB: SELECT pending_checkouts by external_reference (ref/spots/price reales)

    alt pago no aprobado o pending_checkout no existe
        EF3-->>U: 403 — no crea nada
    else pago verificado
        alt kind = cata/curso
            EF3->>DB: INSERT registrations (trigger genera tickets por sesión)
        else type = plan
            EF3->>DB: INSERT subscriptions (monthly_price = plans.price real)
        end
        EF3->>RS: Send email (reserva con QR/PDF · inscripción · bienvenida club)
        RS-->>U: 📧 Email de confirmación
    end
```

⚠️ **El Club DeVinos no cobra de forma recurrente todavía** — este flujo genera una sola fila `subscriptions` activa tras un pago único; no hay PreApproval real de MercadoPago conectado (`create-mp-subscription` existe pero nada la llama). Pendiente a propósito, ver memoria del proyecto.

---

## 5. Diagrama ER (base de datos, simplificado)

Solo tablas activas y sus relaciones clave — no todas las columnas. `courses`/`enrollments` existen todavía en la DB (congeladas, sin lectores/escritores) pero no se muestran acá porque no son parte del modelo vigente.

```mermaid
erDiagram
    branches ||--o{ events : "tiene"
    branches ||--o{ plans : "tiene (o null = todas)"
    branches ||--o{ subscriptions : "asociada"
    branches ||--o{ inquiries : "recibe"
    branches ||--o{ newsletter : "suscriptores"

    events ||--o{ event_sessions : "1 por clase/fecha"
    events ||--o{ registrations : "reservas/inscripciones"
    events ||--o{ event_hosts : "hosts asignados"
    event_sessions ||--o{ tickets : "1 ticket por sesión"
    registrations ||--o{ tickets : "genera (trigger)"
    plans ||--o{ subscriptions : "tiene"

    events {
        uuid id PK
        uuid branch_id FK
        text kind "cata | curso"
        text title
        numeric price
        int total_spots
        int available_spots "autocalculado por trigger"
    }
    event_sessions {
        uuid id PK
        uuid event_id FK
        int session_number
        date date
        timestamptz started_at "ciclo en vivo"
    }
    registrations {
        uuid id PK
        uuid event_id FK
        uuid user_id FK
        int spots
        text status "solo cursos: enrolled|completed|dropped"
        text payment_id UK
        bool attended "override manual, independiente del QR"
    }
    tickets {
        uuid id PK
        uuid session_id FK
        uuid registration_id FK
        text token UK
        timestamptz validated_at
    }
    event_hosts {
        uuid event_id FK
        uuid user_id FK
    }
    plans {
        uuid id PK
        text name
        numeric price
        text mp_plan_id "sin usar — ligado al pendiente #4"
    }
    subscriptions {
        uuid id PK
        uuid plan_id FK
        uuid user_id FK
        numeric monthly_price
        text status
    }
    pending_checkouts {
        uuid id PK
        text ref "event_id o plan_id"
        text type
        text payer_email
    }
```
