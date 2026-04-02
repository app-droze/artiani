insert into public.product_cost_rules (
  name,
  product_type,
  size_label,
  unit_cost,
  currency,
  notes
)
select *
from (
  values
    ('Handbag fixed cost', 'handbag'::public.product_type, null, 35::numeric, 'GEL', 'Initial baseline cost provided on 2026-04-02.'),
    ('Phone case fixed cost', 'phone_case'::public.product_type, null, 20::numeric, 'GEL', 'Initial baseline cost provided on 2026-04-02.'),
    ('Pillow fixed cost', 'pillow'::public.product_type, null, 25::numeric, 'GEL', 'Initial baseline cost provided on 2026-04-02.'),
    ('Scarf 55x55 cost', 'scarf'::public.product_type, '55x55', 12.5::numeric, 'GEL', 'Initial baseline cost provided on 2026-04-02.'),
    ('Scarf 75x75 cost', 'scarf'::public.product_type, '75x75', 30::numeric, 'GEL', 'Initial baseline cost provided on 2026-04-02.'),
    ('Table runner 35x145 cost', 'table_runner'::public.product_type, '35x145', 30::numeric, 'GEL', 'Initial baseline cost provided on 2026-04-02.'),
    ('Table runner 50x200 cost', 'table_runner'::public.product_type, '50x200', 50::numeric, 'GEL', 'Initial baseline cost provided on 2026-04-02.'),
    ('Round tablecloth 110x110 cost', 'tablecloth_round'::public.product_type, '110x110', 50::numeric, 'GEL', 'Initial baseline cost provided on 2026-04-02.'),
    ('Square tablecloth 110x110 cost', 'tablecloth_square'::public.product_type, '110x110', 50::numeric, 'GEL', 'Initial baseline cost provided on 2026-04-02.'),
    ('Round tablecloth 130x130 cost', 'tablecloth_round'::public.product_type, '130x130', 90::numeric, 'GEL', 'Initial baseline cost provided on 2026-04-02.'),
    ('Square tablecloth 130x130 cost', 'tablecloth_square'::public.product_type, '130x130', 90::numeric, 'GEL', 'Initial baseline cost provided on 2026-04-02.'),
    ('Square tablecloth 140x200 cost', 'tablecloth_square'::public.product_type, '140x200', 150::numeric, 'GEL', 'Initial baseline cost provided on 2026-04-02.'),
    ('Square tablecloth 140x240 cost', 'tablecloth_square'::public.product_type, '140x240', 175::numeric, 'GEL', 'Initial baseline cost provided on 2026-04-02.')
) as seed(name, product_type, size_label, unit_cost, currency, notes)
where not exists (
  select 1
  from public.product_cost_rules existing
  where existing.name = seed.name
);
