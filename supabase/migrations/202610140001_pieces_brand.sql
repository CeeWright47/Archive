begin;

alter table public.pieces
  add column if not exists brand text;

-- Backfill from existing piece names, only where exactly one known brand
-- appears as a whole word ("Carhartt midweight zip hoodie" -> Carhartt).
-- Anything ambiguous or unrecognised stays null. Brand words that are also
-- ordinary garment words (Gap, Polo, Champion, Supreme) are left out on
-- purpose.
with brands(brand, pattern) as (
  values
    ('Abercrombie & Fitch', '\mabercrombie\M'),
    ('Adidas',              '\madidas\M'),
    ('Allen Edmonds',       '\mallen edmonds\M'),
    ('American Eagle',      '\mamerican eagle\M'),
    ('Arc''teryx',          '\marc''?teryx\M'),
    ('Banana Republic',     '\mbanana republic\M'),
    ('Barbour',             '\mbarbour\M'),
    ('Birkenstock',         '\mbirkenstocks?\M'),
    ('Buck Mason',          '\mbuck mason\M'),
    ('Carhartt',            '\mcarhartt\M'),
    ('Converse',            '\mconverse\M'),
    ('Dickies',             '\mdickies\M'),
    ('Dr. Martens',         '\mdr\.? ?martens\M|\mdoc martens\M'),
    ('Everlane',            '\meverlane\M'),
    ('Gymshark',            '\mgymshark\M'),
    ('H&M',                 '(^|[^[:alnum:]])h&m([^[:alnum:]]|$)'),
    ('J.Crew',              '\mj\.? ?crew\M'),
    ('L.L.Bean',            '\ml\.? ?l\.? ?bean\M'),
    ('Levi''s',             '\mlevi''?s\M'),
    ('Lululemon',           '\mlululemon\M'),
    ('New Balance',         '\mnew balance\M'),
    ('Nike',                '\mnike\M'),
    ('Patagonia',           '\mpatagonia\M'),
    ('Ralph Lauren',        '\mralph lauren\M'),
    ('Red Wing',            '\mred wing\M'),
    ('Rhone',               '\mrhone\M'),
    ('Stüssy',              '\mst(u|ü)ssy\M'),
    ('Ten Thousand',        '\mten thousand\M'),
    ('The North Face',      '\m(the )?north face\M'),
    ('Timberland',          '\mtimberlands?\M'),
    ('Todd Snyder',         '\mtodd snyder\M'),
    ('Uniqlo',              '\muniqlo\M'),
    ('Vans',                '\mvans\M'),
    ('Vuori',               '\mvuori\M'),
    ('Zara',                '\mzara\M')
),
matches as (
  select p.id, min(b.brand) as brand, count(*) as hits
  from public.pieces p
  join brands b on p.name ~* b.pattern
  where p.brand is null
  group by p.id
)
update public.pieces p
set brand = m.brand
from matches m
where p.id = m.id
  and m.hits = 1;

commit;
