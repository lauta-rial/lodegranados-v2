# Database Schema — Lo de Granados

Design for Supabase Postgres. All tables have `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`, `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`.

## Tables

### branches (sucursales)
| Col | Type | Notes |
|-----|------|-------|
| id | uuid | PK |
| name | text | NOT NULL |
| address | text | |
| phone | text | |

### plans (Club DeVinos planes)
| Col | Type | Notes |
|-----|------|-------|
| id | uuid | PK |
| name | text | NOT NULL, e.g. "Clásico", "Premium" |
| emoji | text | e.g. "🍷" |
| price | integer | Monthly price in ARS |
| features | jsonb | `["benefit 1", "benefit 2", ...]` |
| highlighted | boolean | If true, gets special styling |
| badge | text | Optional badge text, e.g. "Más popular" |
| active | boolean | Default true |
| branch_id | uuid | FK → branches.id, nullable (null = all branches) |

### subscriptions (user memberships)
| Col | Type | Notes |
|-----|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → auth.users.id |
| plan_id | uuid | FK → plans.id |
| status | text | 'active', 'paused', 'cancelled', 'pending' |
| monthly_price | integer | Price at time of subscription |
| start_date | date | |
| notes | text | |
| branch_id | uuid | FK → branches.id |

### events (catas)
| Col | Type | Notes |
|-----|------|-------|
| id | uuid | PK |
| title | text | NOT NULL |
| description | text | |
| date | date | NOT NULL |
| time | time | NOT NULL |
| location | text | NOT NULL |
| total_spots | integer | NOT NULL |
| available_spots | integer | NOT NULL |
| price | integer | ARS |
| active | boolean | Default true |
| image_url | text | |
| branch_id | uuid | FK → branches.id |

### courses (cursos)
| Col | Type | Notes |
|-----|------|-------|
| id | uuid | PK |
| title | text | NOT NULL |
| description | text | |
| instructor_name | text | NOT NULL |
| instructor_bio | text | |
| total_classes | integer | NOT NULL |
| start_date | date | NOT NULL |
| schedule | text | e.g. "Lunes 19:00-21:00" |
| syllabus | jsonb | `["Topic 1", "Topic 2", ...]` |
| price | integer | ARS |
| available_spots | integer | NOT NULL |
| active | boolean | Default true |
| image_url | text | |
| branch_id | uuid | FK → branches.id |

### registrations (inscripciones a catas)
| Col | Type | Notes |
|-----|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → auth.users.id |
| event_id | uuid | FK → events.id |
| name | text | |
| email | text | |
| spots | integer | Default 1 |
| attended | boolean | Default false |
| payment_id | text | MercadoPago payment ID |

### enrollments (inscripciones a cursos)
| Col | Type | Notes |
|-----|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → auth.users.id |
| course_id | uuid | FK → courses.id |
| name | text | |
| email | text | |
| status | text | 'enrolled', 'completed', 'dropped' |
| payment_id | text | MercadoPago payment ID |

### inquiries (consultas empresas)
| Col | Type | Notes |
|-----|------|-------|
| id | uuid | PK |
| name | text | NOT NULL |
| email | text | NOT NULL |
| message | text | NOT NULL |
| status | text | 'new', 'read', 'archived' |
| branch_id | uuid | FK → branches.id |

### newsletter
| Col | Type | Notes |
|-----|------|-------|
| id | uuid | PK |
| email | text | NOT NULL UNIQUE |

## RLS Policies

```sql
-- Branches: public read, admin write
CREATE POLICY "Public read branches" ON branches FOR SELECT USING (true);

-- Events/Courses: public read active ones, admin CRUD their branch
CREATE POLICY "Public read active events" ON events FOR SELECT USING (active = true);
CREATE POLICY "Admin manage branch events" ON events USING (
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'branch_id' = events.branch_id::text)
);

-- Subscriptions: users read own, admin read branch
CREATE POLICY "User read own subscriptions" ON subscriptions FOR SELECT USING (user_id = auth.uid());
```

## Migrations from SQLite

Mapping issues to handle:
- SQLite `simple-enum` → Postgres native `text` with CHECK constraint, or enum type
- SQLite `simple-json` → Postgres `jsonb`
- SQLite auto-increment integers → Postgres UUID
- bcrypt passwords → Supabase Auth handles this (no password column needed)
- Old `user.branch_id` was removed in migration DB-002 → Supabase uses `user_metadata.branch_id`
