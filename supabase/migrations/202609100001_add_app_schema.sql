begin;

create table if not exists public.outfits (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  image_paths text[] not null default '{}',
  date_worn date,
  occasion text not null default '',
  note text not null default '',
  piece_ids text[] not null default '{}',
  profile_tag text,
  source_type text not null default 'self-photo'
    check (source_type in ('self-photo')),
  in_inspo boolean not null default false,
  added bigint not null
);

create table if not exists public.preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  style_text text,
  fit_preferences jsonb not null default '{}',
  colors jsonb not null default '[]',
  occasions jsonb not null default '[]',
  stores jsonb not null default '[]',
  budget jsonb not null default '{}',
  app_settings jsonb not null default '{}',
  climate jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.user_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  body_info jsonb not null default '{}',
  sizes jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.style_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profiles jsonb not null default '[]'
    check (jsonb_typeof(profiles) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outfits_user_id_idx
  on public.outfits (user_id);
create index if not exists style_assessments_user_id_idx
  on public.style_assessments (user_id);

alter table public.outfits enable row level security;
alter table public.preferences enable row level security;
alter table public.user_profile enable row level security;
alter table public.style_assessments enable row level security;

grant select, insert, update, delete on table
  public.outfits,
  public.preferences,
  public.user_profile,
  public.style_assessments
  to authenticated;

drop policy if exists "Users select own outfits" on public.outfits;
create policy "Users select own outfits"
  on public.outfits for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users insert own outfits" on public.outfits;
create policy "Users insert own outfits"
  on public.outfits for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own outfits" on public.outfits;
create policy "Users update own outfits"
  on public.outfits for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users delete own outfits" on public.outfits;
create policy "Users delete own outfits"
  on public.outfits for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users select own preferences" on public.preferences;
create policy "Users select own preferences"
  on public.preferences for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users insert own preferences" on public.preferences;
create policy "Users insert own preferences"
  on public.preferences for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own preferences" on public.preferences;
create policy "Users update own preferences"
  on public.preferences for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users delete own preferences" on public.preferences;
create policy "Users delete own preferences"
  on public.preferences for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users select own profile" on public.user_profile;
create policy "Users select own profile"
  on public.user_profile for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users insert own profile" on public.user_profile;
create policy "Users insert own profile"
  on public.user_profile for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own profile" on public.user_profile;
create policy "Users update own profile"
  on public.user_profile for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users delete own profile" on public.user_profile;
create policy "Users delete own profile"
  on public.user_profile for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users select own assessments" on public.style_assessments;
create policy "Users select own assessments"
  on public.style_assessments for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users insert own assessments" on public.style_assessments;
create policy "Users insert own assessments"
  on public.style_assessments for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own assessments" on public.style_assessments;
create policy "Users update own assessments"
  on public.style_assessments for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users delete own assessments" on public.style_assessments;
create policy "Users delete own assessments"
  on public.style_assessments for delete to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public)
values ('archive-images', 'archive-images', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Users read own archive images" on storage.objects;
create policy "Users read own archive images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'archive-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "Users upload own archive images" on storage.objects;
create policy "Users upload own archive images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'archive-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "Users update own archive images" on storage.objects;
create policy "Users update own archive images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'archive-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'archive-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "Users delete own archive images" on storage.objects;
create policy "Users delete own archive images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'archive-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;
