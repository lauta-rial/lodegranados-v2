-- Per-branch MercadoPago credentials so each sucursal collects into its own
-- MP account. These are SECRETS: the table has RLS enabled and deliberately
-- NO policies, so only the service_role (edge functions) can ever read/write
-- them — anon/authenticated clients get nothing. No UI for now; rows are
-- loaded manually. Falls back to the global MP_ACCESS_TOKEN env when a branch
-- has no row.
create table if not exists branch_mp_credentials (
  branch_id uuid primary key references branches (id) on delete cascade,
  access_token text not null,
  public_key text,
  webhook_secret text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table branch_mp_credentials enable row level security;
-- (intentionally no policies — service_role bypasses RLS; everyone else denied)
