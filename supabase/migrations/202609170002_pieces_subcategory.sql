begin;

alter table public.pieces
  add column if not exists subcategory text;

commit;
