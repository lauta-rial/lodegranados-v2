-- Per-branch province and postal code (CP), editable in the admin.
alter table branches add column if not exists province text;
alter table branches add column if not exists postal_code text;
