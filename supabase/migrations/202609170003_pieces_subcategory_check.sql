begin;

-- Mirrors SUBCATEGORIES_BY_CATEGORY in src/storage/subcategories.ts.
-- Category values are normalized the same way the app does (legacy rows use singular/lowercase).
create or replace function public.piece_subcategory_valid(category text, subcategory text)
returns boolean
language sql
immutable
as $$
  select subcategory is null or subcategory = any (
    case lower(trim(coalesce(category, '')))
      when 'top' then array['Tee','Polo','Button-up','Knit','Jersey','Tank','Sweatshirt','Hoodie']
      when 'tops' then array['Tee','Polo','Button-up','Knit','Jersey','Tank','Sweatshirt','Hoodie']
      when 'bottom' then array['Jeans','Chinos','Cargos','Shorts','Slacks','Joggers']
      when 'bottoms' then array['Jeans','Chinos','Cargos','Shorts','Slacks','Joggers']
      when 'shoe' then array['Sneakers','Boots','Loafers','Boat shoes','Mocs','Sandals']
      when 'shoes' then array['Sneakers','Boots','Loafers','Boat shoes','Mocs','Sandals']
      when 'outerwear' then array['Jacket','Coat','Overshirt','Vest']
      when 'accessory' then array['Hat','Belt','Watch','Jewelry','Bag']
      when 'accessories' then array['Hat','Belt','Watch','Jewelry','Bag']
      else array['Hat','Belt','Watch','Jewelry','Bag']
    end
  );
$$;

alter table public.pieces
  drop constraint if exists pieces_subcategory_matches_category;

alter table public.pieces
  add constraint pieces_subcategory_matches_category
  check (public.piece_subcategory_valid(category, subcategory));

commit;
