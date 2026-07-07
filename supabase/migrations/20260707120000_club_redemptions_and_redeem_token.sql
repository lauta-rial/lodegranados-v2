-- Club DeVinos monthly wine redemption.
-- A subscription gets a stable QR token; a member picks up that month's wines
-- once, and an admin scans the token to mark the pickup. One redemption per
-- (subscription, calendar month) — the unique constraint makes a double pickup
-- impossible even under a double scan.

-- 1. Stable per-subscription redeem token (the QR payload).
alter table subscriptions add column if not exists redeem_token text;
update subscriptions set redeem_token = replace(gen_random_uuid()::text, '-', '') where redeem_token is null;
alter table subscriptions alter column redeem_token set default replace(gen_random_uuid()::text, '-', '');
alter table subscriptions alter column redeem_token set not null;
create unique index if not exists subscriptions_redeem_token_key on subscriptions (redeem_token);

-- 2. Monthly redemption ledger.
create table if not exists club_redemptions (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions (id) on delete cascade,
  period text not null,                       -- 'YYYY-MM' calendar month (America/Argentina/Buenos_Aires)
  redeemed_at timestamptz not null default now(),
  redeemed_by uuid references auth.users (id) on delete set null,
  unique (subscription_id, period)
);

alter table club_redemptions enable row level security;

-- Admins/superadmins do the scanning: full read+write.
create policy "Admin manage club_redemptions" on club_redemptions for all
  using ((((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['admin', 'superadmin'])))
  with check ((((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['admin', 'superadmin'])));

-- Members see their own pickup history (to show "canjeado este mes").
create policy "User read own club_redemptions" on club_redemptions for select
  using (exists (
    select 1 from subscriptions s
    where s.id = club_redemptions.subscription_id
      and s.user_id = (select auth.uid())
  ));
