begin;

alter table public.pieces
  add column if not exists rating smallint,
  add constraint pieces_rating_range check (rating is null or rating between 1 and 5);

alter table public.inspo
  add column if not exists rating smallint,
  add constraint inspo_rating_range check (rating is null or rating between 1 and 5);

alter table public.fits
  add column if not exists rating smallint,
  add constraint fits_rating_range check (rating is null or rating between 1 and 5);

commit;
