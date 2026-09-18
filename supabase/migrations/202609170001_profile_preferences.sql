begin;

alter table public.user_profile
  add column if not exists mobile text;

-- Tri-state colors need worn/avoid buckets; the original array default can't hold that.
alter table public.preferences
  alter column colors set default '{"worn": [], "avoid": []}'::jsonb;

update public.preferences
set colors = '{"worn": [], "avoid": []}'::jsonb
where jsonb_typeof(colors) <> 'object';

alter table public.style_assessments
  add column if not exists inputs_hash text;

commit;
