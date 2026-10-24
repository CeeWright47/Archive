begin;

-- Photos move to the private archive-images bucket (policies in
-- 202609100001). Rows store the original's path; the grid thumbnail sits
-- beside it at the same path with ".thumb.jpg".
--
-- pieces.image is cleared as each piece's photo is moved (no server function
-- reads it). inspo.image keeps its 480px copy because generate-fit and
-- style-assessment send it to the model.
alter table public.pieces
  add column if not exists image_path text;

alter table public.inspo
  add column if not exists image_path text;

-- Outfits move from device-only storage to this table; they already carry a
-- rating in the app.
alter table public.outfits
  add column if not exists rating smallint,
  add constraint outfits_rating_range check (rating is null or rating between 1 and 5);

commit;
