begin;

alter table public.user_profile
  add column if not exists username text;

-- Case-insensitive uniqueness (we always store/compare lowercase, but this
-- guards against any value written outside that normalization too).
create unique index if not exists user_profile_username_unique
  on public.user_profile (lower(username))
  where username is not null;

alter table public.user_profile
  drop constraint if exists user_profile_username_format;
alter table public.user_profile
  add constraint user_profile_username_format
  check (username is null or username ~ '^[a-z][a-z0-9_]{2,19}$');

-- Lets the client check availability while typing without granting read
-- access to other users' profile rows: SECURITY DEFINER bypasses RLS for
-- this one narrow existence check only, and returns nothing but a boolean.
create or replace function public.is_username_available(check_username text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.user_profile
    where lower(username) = lower(check_username)
  );
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to authenticated;

commit;
