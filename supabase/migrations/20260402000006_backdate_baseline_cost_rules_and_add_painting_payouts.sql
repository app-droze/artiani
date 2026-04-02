update public.product_cost_rules
set effective_from = date '2026-01-01'
where notes = 'Initial baseline cost provided on 2026-04-02.'
  and effective_from > date '2026-01-01';

insert into public.product_cost_rules (
  name,
  product_id,
  unit_cost,
  currency,
  effective_from,
  notes
)
select
  seed.name,
  products.id,
  seed.unit_cost,
  'GEL',
  date '2026-01-01',
  seed.notes
from (
  values
    ('Painting Good Shepherd payout', 'painting-good-shepherd', 350::numeric, 'Painter payout cost provided on 2026-04-02.'),
    ('Painting Lamb Easter payout', 'painting-lamb-easter', 500::numeric, 'Painter payout cost provided on 2026-04-02.'),
    ('Painting Lamb sold payout', 'painting-lamb', 250::numeric, 'Painter payout cost provided on 2026-04-02.'),
    ('Painting Spring payout', 'painting-family', 400::numeric, 'Painter payout cost provided on 2026-04-02.'),
    ('Painting Lamb with ornaments payout', 'painting-lamb-with-ornaments', 300::numeric, 'Painter payout cost provided on 2026-04-02.')
) as seed(name, product_slug, unit_cost, notes)
join public.products
  on products.slug = seed.product_slug
where not exists (
  select 1
  from public.product_cost_rules existing
  where existing.name = seed.name
);
