alter table public.packaging_catalog
  add column if not exists item_kind text not null default 'packaging';

alter table public.packaging_catalog
  drop constraint if exists packaging_catalog_item_kind_check;

alter table public.packaging_catalog
  add constraint packaging_catalog_item_kind_check
  check (item_kind in ('packaging', 'gift'));

update public.packaging_catalog
set
  item_kind = case
    when code = 'sticker_gift' then 'gift'
    else 'packaging'
  end,
  name = case
    when code = 'paper_pillow' then 'Paper Pillow Bag'
    else name
  end,
  updated_at = now()
where
  item_kind is distinct from case
    when code = 'sticker_gift' then 'gift'
    else 'packaging'
  end
  or (
    code = 'paper_pillow'
    and name is distinct from 'Paper Pillow Bag'
  );

insert into public.packaging_catalog (
  code,
  name,
  item_kind,
  unit_cost,
  currency,
  notes
)
select
  preset.code,
  preset.name,
  preset.item_kind,
  preset.unit_cost,
  'GEL',
  preset.notes
from (
  values
    ('paper_pillow', 'Paper Pillow Bag', 'packaging', 3.5::numeric, 'Current paper pillow bag wrap.'),
    ('paper_box', 'Paper Box', 'packaging', 0::numeric, 'Fill the real cost after purchase.'),
    ('paper_bag_large', 'Large Paper Bag', 'packaging', 0::numeric, 'Fill the real cost after purchase.'),
    ('paper_bag_small', 'Small Paper Bag', 'packaging', 0::numeric, 'Fill the real cost after purchase.'),
    ('plastic_bag_large', 'Large Plastic Bag', 'packaging', 0::numeric, 'Fill the real cost after purchase.'),
    ('plastic_bag_small', 'Small Plastic Bag', 'packaging', 0::numeric, 'Fill the real cost after purchase.'),
    ('sticker_gift', 'Sticker Gift', 'gift', 0::numeric, 'Gift insert tracked through stock purchases.')
) as preset(code, name, item_kind, unit_cost, notes)
where not exists (
  select 1
  from public.packaging_catalog
  where packaging_catalog.code = preset.code
);

update public.inventory_items as items
set
  name = catalog.name,
  item_kind = catalog.item_kind,
  default_unit_cost = catalog.unit_cost,
  notes = coalesce(items.notes, catalog.notes)
from public.packaging_catalog as catalog
where items.packaging_catalog_id = catalog.id
  and (
    items.name is distinct from catalog.name
    or items.item_kind is distinct from catalog.item_kind
    or items.default_unit_cost is distinct from catalog.unit_cost
  );
