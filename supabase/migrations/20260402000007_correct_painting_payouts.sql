update public.product_cost_rules
set
  unit_cost = 250::numeric,
  notes = 'Painter payout corrected on 2026-04-02: Lamb Easter sold for 450 GEL and 250 GEL was paid to Levani.'
where name = 'Painting Lamb Easter payout';

update public.product_cost_rules
set
  unit_cost = 500::numeric,
  notes = 'Painter payout corrected on 2026-04-02: sold Lamb was sold for 500 GEL and the full 500 GEL was paid to Levani.'
where name = 'Painting Lamb sold payout';
