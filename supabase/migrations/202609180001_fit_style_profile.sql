begin;

alter table public.fits
  add column if not exists style_profile_id text,
  add column if not exists style_profile_name text;

create or replace function public.preserve_fit_style_profile_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.style_profile_name is not null then
    new.style_profile_id := old.style_profile_id;
    new.style_profile_name := old.style_profile_name;
  end if;
  return new;
end;
$$;

drop trigger if exists preserve_fit_style_profile_snapshot on public.fits;
create trigger preserve_fit_style_profile_snapshot
  before update of style_profile_id, style_profile_name on public.fits
  for each row execute function public.preserve_fit_style_profile_snapshot();

commit;