create extension if not exists pg_net;

create or replace function public.handle_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    perform net.http_post(
      url := 'https://ccmjlbkvafkwyvehktxt.supabase.co/functions/v1/send-email',
      headers := jsonb_build_object('Content-Type', 'application/json'),
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
