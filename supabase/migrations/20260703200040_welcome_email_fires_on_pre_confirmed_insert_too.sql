-- handle_email_confirmed() only fired on UPDATE (email_confirmed_at
-- transitioning from null), which covers the normal email/password
-- signup-then-click-link flow. But Google OAuth sign-ins and admin-created
-- users (auth.admin.createUser with email_confirm: true) get their
-- auth.users row INSERTed with email_confirmed_at already set — there's no
-- later UPDATE transition, so those accounts never got a welcome email.
-- Add a matching AFTER INSERT trigger for that case. The existing AFTER
-- UPDATE trigger is untouched and won't double-fire: it only reacts to a
-- transition from null, which never happens for these already-confirmed
-- inserts.

drop trigger if exists on_auth_user_email_confirmed_insert on auth.users;
create trigger on_auth_user_email_confirmed_insert
  after insert on auth.users
  for each row
  when (new.email_confirmed_at is not null)
  execute function public.handle_email_confirmed();
