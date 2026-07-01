# Architecture Diagrams — Lo de Granados v2

## 1. Arquitectura general

```mermaid
graph TB
    subgraph Vercel["☁️ Vercel"]
        React["React 19 + Vite\nTanStack Query · React Router"]
    end

    subgraph Supabase["🔷 Supabase"]
        Auth["Auth\nJWT + RLS"]
        DB["Postgres\n11 tablas"]
        Storage["Storage\nbucket: media"]
        EF1["Edge Fn\ncreate-mp-preference"]
        EF2["Edge Fn\nmp-webhook"]
        EF3["Edge Fn\nsend-email"]
    end

    MP["💳 MercadoPago"]
    Resend["📧 Resend"]
    User["👤 Usuario"]
    Admin["🔑 Admin"]

    User --> React
    Admin --> React
    React --> Auth
    React --> DB
    React --> Storage
    React -->|"POST (JWT)"| EF1
    EF1 --> MP
    MP -->|"webhook firmado\n(HMAC-SHA256)"| EF2
    EF2 --> DB
    EF2 --> EF3
    EF3 --> Resend
    Resend -->|"email confirmación"| User
```

---

## 2. Mapa de rutas y permisos

```mermaid
graph LR
    subgraph PUB["🌐 Público — sin login"]
        A["/"] --> B["/:branch"]
        B --> C["/:branch/catas"]
        C --> D["/:branch/catas/:id"]
        B --> E["/:branch/cursos"]
        E --> F["/:branch/cursos/:id"]
        B --> G["/:branch/club"]
        G --> H["/:branch/club/:planId"]
        B --> I["/:branch/empresas"]
        B --> J["/:branch/faq"]
        K["/login"]
        L["/register"]
        M["/forgot-password"]
    end

    subgraph AUTH["🔐 Usuario autenticado"]
        N["/mi-cuenta\n(reservas + QR)"]
        O["/pago-exitoso"]
        P["/pago-fallido"]
        Q["/pago-pendiente"]
    end

    subgraph ADMIN["🔑 Admin — app_metadata.role = admin"]
        R["/admin\n(dashboard KPIs)"]
        R --> S["/admin/catas\n(eventos + inscripciones)"]
        R --> T["/admin/cursos\n(cursos + matrículas)"]
        R --> U["/admin/club\n(planes + suscripciones)"]
        R --> V["/admin/consultas"]
        R --> W["/admin/newsletter"]
        R --> X["/admin/sucursales\n⚠️ solo superadmin"]
        S --> Y["/admin/scanner/:eventId\n(QR scanner)"]
    end
```

---

## 3. Modelo de permisos de admin

```mermaid
graph TB
    JWT["JWT del usuario\n(Supabase Auth)"]

    JWT --> AM["app_metadata\n(solo editable por service role)"]
    AM --> R["role: 'admin'"]
    AM --> B["branch_id: uuid | null"]

    R & B --> SA{"branch_id\n= null?"}

    SA -->|"Sí"| SUPER["🌍 Superadmin\nVe TODOS los datos\nde TODAS las sucursales"]
    SA -->|"No"| BRANCH["🏠 Admin de sucursal\nSolo ve eventos/cursos/\ninscripciones de SU sucursal"]

    subgraph RLS["RLS en Postgres"]
        POL["Política: app_metadata->>role = 'admin'\nAND (app_metadata->>branch_id IS NULL\nOR app_metadata->>branch_id = branch_id)"]
    end

    SUPER --> POL
    BRANCH --> POL
```

---

## 4. Flujo de pago completo

```mermaid
sequenceDiagram
    actor U as Usuario
    participant R as React
    participant EF1 as create-mp-preference
    participant MP as MercadoPago
    participant EF2 as mp-webhook
    participant DB as Postgres
    participant EF3 as send-email
    participant RS as Resend

    U->>R: Click CTA (Reservar / Inscribirse / Suscribirse)
    R->>EF1: POST {type, refId, branchSlug, qty, siteUrl}
    EF1->>DB: INSERT pending_checkouts
    EF1->>MP: Create preference (precio, back_urls, metadata)
    MP-->>EF1: init_point URL
    EF1-->>R: { url }
    R->>MP: redirect → checkout de MP

    U->>MP: Completa pago con tarjeta
    MP-->>U: Redirect → /pago-exitoso

    MP->>EF2: POST (signed HMAC-SHA256)
    EF2->>EF2: Valida firma
    EF2->>DB: SELECT pending_checkouts (idempotency check)

    alt type = event
        EF2->>DB: INSERT registrations
        EF2->>DB: INSERT tickets (QR code)
        EF2->>DB: decrement_event_spots()
    else type = course
        EF2->>DB: INSERT enrollments
        EF2->>DB: decrement_course_spots()
    else type = subscription
        EF2->>DB: INSERT subscriptions
    end

    EF2->>DB: UPDATE pending_checkouts SET processed_at = now()
    EF2->>EF3: POST {type, userId, refId}
    EF3->>RS: Send email (reserva con QR / matrícula / bienvenida club)
    RS-->>U: 📧 Email de confirmación
```

---

## 5. Flujo de autenticación

```mermaid
sequenceDiagram
    actor U as Usuario
    participant R as React
    participant SA as Supabase Auth
    participant DB as Postgres

    U->>R: Email + password
    R->>SA: signInWithPassword()
    SA-->>R: JWT (access_token + refresh_token)
    Note over R: JWT en localStorage

    R->>DB: SELECT eventos/reservas/etc (con JWT en header)
    Note over DB: RLS evalúa auth.jwt()->'app_metadata'
    DB-->>R: Solo datos autorizados por policies

    Note over R,SA: JWT expira en 1 hora
    R->>SA: Refresh automático con refresh_token
    SA-->>R: Nuevo JWT
```

---

## 6. Diagrama ER (base de datos)

```mermaid
erDiagram
    branches {
        uuid id PK
        text slug UK
        text name
        text address
        text phone
        text email
        text instagram
    }
    events {
        uuid id PK
        uuid branch_id FK
        text title
        date date
        time time
        text location
        numeric price
        int available_spots
        bool active
        text image_url
    }
    courses {
        uuid id PK
        uuid branch_id FK
        text title
        text instructor
        numeric price
        int available_spots
        bool active
        jsonb syllabus
    }
    plans {
        uuid id PK
        text name
        text emoji
        numeric price
        text[] features
        bool highlighted
        bool active
    }
    registrations {
        uuid id PK
        uuid event_id FK
        uuid user_id FK
        text payment_id UK
        text status
        text name
        text email
        int tickets_qty
    }
    tickets {
        uuid id PK
        uuid event_id FK
        uuid registration_id FK
        text qr_code UK
        timestamptz validated_at
        text validated_by
    }
    enrollments {
        uuid id PK
        uuid course_id FK
        uuid user_id FK
        text payment_id UK
        text status
    }
    subscriptions {
        uuid id PK
        uuid plan_id FK
        uuid user_id FK
        uuid branch_id FK
        text payment_id UK
        text preapproval_id
        text status
    }
    inquiries {
        uuid id PK
        uuid branch_id FK
        text name
        text email
        text message
    }
    newsletter {
        uuid id PK
        uuid branch_id FK
        text email UK
    }
    pending_checkouts {
        uuid id PK
        text payment_id UK
        text type
        uuid ref_id
        uuid branch_id
        timestamptz processed_at
    }

    branches ||--o{ events : "tiene"
    branches ||--o{ courses : "tiene"
    branches ||--o{ subscriptions : "asociada"
    branches ||--o{ inquiries : "recibe"
    branches ||--o{ newsletter : "suscriptores"
    events ||--o{ registrations : "tiene"
    events ||--o{ tickets : "genera"
    registrations ||--o{ tickets : "produce"
    courses ||--o{ enrollments : "tiene"
    plans ||--o{ subscriptions : "tiene"
```
