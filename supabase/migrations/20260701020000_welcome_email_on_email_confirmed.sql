-- Sends the "welcome" email exactly once, right when an account's email
-- gets confirmed, instead of firing from the client at signUp() time
-- (which used to send it even to accounts that never confirmed).
--
-- Two triggers feed the same function:
--   1. AFTER UPDATE — the normal email/password flow: a row is inserted
--      with email_confirmed_at = null, then updated to non-null once the
--      user clicks the confirmation link.
--   2. AFTER INSERT — Google OAuth sign-ins and admin-created users
--      (auth.admin.createUser with email_confirm: true) get their row
--      inserted with email_confirmed_at already set. There's no UPDATE
--      transition for these, so trigger #1 alone would never fire for them.
--
-- The function checks tg_op before touching OLD, since OLD is not assigned
-- in an INSERT trigger (referencing it unconditionally raises "record 'old'
-- is not assigned yet").

create extension if not exists pg_net;

create or replace function public.handle_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.email_confirmed_at is not null and (tg_op = 'INSERT' or old.email_confirmed_at is null) then
    perform net.http_post(
      url := 'https://ccmjlbkvafkwyvehktxt.supabase.co/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        -- Anon key — public by design (shipped in the client bundle already,
        -- same value used in e2e/supabase-admin.ts), safe to commit. Required
        -- because Supabase's edge function gateway rejects requests with no
        -- apikey/Authorization header at all, even for verify_jwt:false functions.
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjbWpsYmt2YWZrd3l2ZWhrdHh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzQxNjcsImV4cCI6MjA5NjQ1MDE2N30.Ruryu1G_Oaoo-NoMvByOrrKL8Cos6ppYupALdHHipYY',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjbWpsYmt2YWZrd3l2ZWhrdHh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzQxNjcsImV4cCI6MjA5NjQ1MDE2N30.Ruryu1G_Oaoo-NoMvByOrrKL8Cos6ppYupALdHHipYY'
      ),
      body := jsonb_build_object(
        'type', 'welcome',
        'to', new.email,
        'name', split_part(new.email, '@', 1),
        'data', jsonb_build_object('siteUrl', 'https://lodegranados-v2-chi.vercel.app')
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update on auth.users
  for each row
  execute function public.handle_email_confirmed();

drop trigger if exists on_auth_user_email_confirmed_insert on auth.users;
create trigger on_auth_user_email_confirmed_insert
  after insert on auth.users
  for each row
  when (new.email_confirmed_at is not null)
  execute function public.handle_email_confirmed();
