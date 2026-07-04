
-- updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- branches
CREATE TABLE branches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  address    TEXT,
  phone      TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read branches" ON branches FOR SELECT USING (true);
CREATE POLICY "Admin manage branches" ON branches FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- plans
CREATE TABLE plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  emoji       TEXT,
  price       INTEGER,
  features    JSONB DEFAULT '[]',
  highlighted BOOLEAN DEFAULT false,
  badge       TEXT,
  active      BOOLEAN DEFAULT true,
  branch_id   UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active plans" ON plans FOR SELECT USING (active = true);
CREATE POLICY "Admin manage plans" ON plans FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- subscriptions
CREATE TABLE subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id       UUID REFERENCES plans(id) ON DELETE RESTRICT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'paused', 'cancelled', 'pending')),
  monthly_price INTEGER,
  start_date    DATE,
  notes         TEXT,
  branch_id     UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User read own subscriptions" ON subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin manage subscriptions" ON subscriptions FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- events
CREATE TABLE events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  date             DATE NOT NULL,
  time             TIME NOT NULL,
  location         TEXT NOT NULL,
  total_spots      INTEGER NOT NULL,
  available_spots  INTEGER NOT NULL,
  price            INTEGER,
  active           BOOLEAN DEFAULT true,
  image_url        TEXT,
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active events" ON events FOR SELECT USING (active = true);
CREATE POLICY "Admin manage branch events" ON events FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  AND (
    (auth.jwt() -> 'user_metadata' ->> 'branch_id') IS NULL
    OR (auth.jwt() -> 'user_metadata' ->> 'branch_id') = branch_id::text
  )
);

-- courses
CREATE TABLE courses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  instructor_name  TEXT NOT NULL,
  instructor_bio   TEXT,
  total_classes    INTEGER NOT NULL,
  start_date       DATE NOT NULL,
  schedule         TEXT,
  syllabus         JSONB DEFAULT '[]',
  price            INTEGER,
  available_spots  INTEGER NOT NULL,
  active           BOOLEAN DEFAULT true,
  image_url        TEXT,
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active courses" ON courses FOR SELECT USING (active = true);
CREATE POLICY "Admin manage branch courses" ON courses FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  AND (
    (auth.jwt() -> 'user_metadata' ->> 'branch_id') IS NULL
    OR (auth.jwt() -> 'user_metadata' ->> 'branch_id') = branch_id::text
  )
);

-- registrations
CREATE TABLE registrations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name        TEXT,
  email       TEXT,
  spots       INTEGER DEFAULT 1,
  attended    BOOLEAN DEFAULT false,
  payment_id  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER registrations_updated_at BEFORE UPDATE ON registrations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User read own registrations" ON registrations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin manage registrations" ON registrations FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- enrollments
CREATE TABLE enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name        TEXT,
  email       TEXT,
  status      TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'dropped')),
  payment_id  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER enrollments_updated_at BEFORE UPDATE ON enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User read own enrollments" ON enrollments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin manage enrollments" ON enrollments FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- inquiries
CREATE TABLE inquiries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  branch_id  UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER inquiries_updated_at BEFORE UPDATE ON inquiries FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit inquiry" ON inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin manage inquiries" ON inquiries FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- newsletter
CREATE TABLE newsletter (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER newsletter_updated_at BEFORE UPDATE ON newsletter FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE newsletter ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can subscribe" ON newsletter FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read newsletter" ON newsletter FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- indexes
CREATE INDEX idx_events_date     ON events(date);
CREATE INDEX idx_events_branch   ON events(branch_id);
CREATE INDEX idx_events_active   ON events(active);
CREATE INDEX idx_courses_start   ON courses(start_date);
CREATE INDEX idx_courses_branch  ON courses(branch_id);
CREATE INDEX idx_courses_active  ON courses(active);
CREATE INDEX idx_subs_user       ON subscriptions(user_id);
CREATE INDEX idx_subs_status     ON subscriptions(status);
CREATE INDEX idx_regs_event      ON registrations(event_id);
CREATE INDEX idx_regs_user       ON registrations(user_id);
CREATE INDEX idx_enr_course      ON enrollments(course_id);
CREATE INDEX idx_enr_user        ON enrollments(user_id);
CREATE INDEX idx_inq_status      ON inquiries(status);
