begin;

-- Supersedes the single-arg version from 202610240001: excludes the
-- checking user's own row from the uniqueness check at the database layer,
-- rather than relying on the client to track and pass its "original"
-- username (which goes stale the instant a save succeeds, since nothing
-- told the client its own new value was now the thing in the database).
drop function if exists public.is_username_available(text);

create or replace function public.is_username_available(
  check_username text,
  exclude_user_id uuid default null
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.user_profile
    where lower(username) = lower(check_username)
      and (exclude_user_id is null or user_id <> exclude_user_id)
  );
$$;

revoke all on function public.is_username_available(text, uuid) from public;
grant execute on function public.is_username_available(text, uuid) to authenticated;

commit;
