create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  item_kind text not null,
  unit text not null default 'pcs',
  product_type public.product_type,
  size_label text,
  packaging_catalog_id uuid references public.packaging_catalog(id),
  default_unit_cost numeric,
  currency text not null default 'GEL',
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_items_code_key unique (code),
  constraint inventory_items_kind_check
    check (item_kind in ('sellable', 'packaging', 'gift', 'supply')),
  constraint inventory_items_default_unit_cost_check
    check (default_unit_cost is null or default_unit_cost >= 0)
);

create index if not exists inventory_items_kind_idx
  on public.inventory_items (item_kind);

create index if not exists inventory_items_active_idx
  on public.inventory_items (is_active);

comment on table public.inventory_items is
  'Catalog of stock-tracked sellable items, packaging, gifts, and supplies used for cash visibility and inventory value tracking.';

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id),
  movement_type text not null,
  movement_date date not null default current_date,
  qty_delta numeric not null,
  value_delta numeric not null default 0,
  currency text not null default 'GEL',
  vendor text,
  reference_order_id uuid references public.orders(id),
  notes text,
  created_at timestamptz not null default now(),
  constraint inventory_movements_type_check
    check (movement_type in ('purchase', 'usage', 'adjustment_in', 'adjustment_out')),
  constraint inventory_movements_qty_nonzero_check
    check (qty_delta <> 0),
  constraint inventory_movements_value_sign_check
    check (
      (movement_type in ('purchase', 'adjustment_in') and qty_delta > 0 and value_delta >= 0)
      or
      (movement_type in ('usage', 'adjustment_out') and qty_delta < 0 and value_delta <= 0)
    )
);

create index if not exists inventory_movements_item_idx
  on public.inventory_movements (inventory_item_id);

create index if not exists inventory_movements_date_idx
  on public.inventory_movements (movement_date desc);

comment on table public.inventory_movements is
  'Ledger of inventory purchases and stock movements. Positive rows add stock/value, negative rows reduce stock/value.';

drop view if exists public.reporting_inventory_summary_v1;
drop view if exists public.reporting_inventory_position_v1;

create view public.reporting_inventory_position_v1 as
with movement_totals as (
  select
    inventory_item_id,
    sum(qty_delta) as qty_on_hand,
    sum(value_delta) as stock_value_amount
  from public.inventory_movements
  group by 1
)
select
  items.id as inventory_item_id,
  items.code,
  items.name,
  items.item_kind,
  items.unit,
  items.product_type,
  items.size_label,
  items.packaging_catalog_id,
  items.default_unit_cost,
  items.currency,
  items.is_active,
  items.notes,
  coalesce(movement_totals.qty_on_hand, 0) as qty_on_hand,
  coalesce(movement_totals.stock_value_amount, 0) as stock_value_amount,
  case
    when coalesce(movement_totals.qty_on_hand, 0) <> 0
      then round(movement_totals.stock_value_amount / movement_totals.qty_on_hand, 2)
    else items.default_unit_cost
  end as estimated_unit_value
from public.inventory_items as items
left join movement_totals
  on movement_totals.inventory_item_id = items.id
order by items.item_kind asc, items.name asc;

comment on view public.reporting_inventory_position_v1 is
  'Current inventory position by item, including on-hand quantity and remaining stock value.';

create view public.reporting_inventory_summary_v1 as
select
  count(*) filter (where qty_on_hand > 0) as items_in_stock_count,
  coalesce(sum(qty_on_hand) filter (where qty_on_hand > 0), 0) as total_units_on_hand,
  coalesce(sum(stock_value_amount) filter (where qty_on_hand > 0), 0) as stock_on_hand_value_amount,
  coalesce((
    select sum(value_delta)
    from public.inventory_movements
    where movement_type = 'purchase'
  ), 0) as total_inventory_purchase_amount,
  coalesce((
    select sum(-value_delta)
    from public.inventory_movements
    where movement_type in ('usage', 'adjustment_out')
  ), 0) as total_inventory_released_amount
from public.reporting_inventory_position_v1;

comment on view public.reporting_inventory_summary_v1 is
  'Inventory summary for dashboard cash interpretation, including stock on hand value and cumulative purchase spend.';

insert into public.inventory_items (
  code,
  name,
  item_kind,
  unit,
  product_type,
  size_label,
  default_unit_cost,
  notes
)
values
  ('scarf_55x55_printed', 'Printed scarf 55x55', 'sellable', 'pcs', 'scarf'::public.product_type, '55x55', 12.5, 'Initial inventory item seeded on 2026-04-02.'),
  ('scarf_75x75_printed', 'Printed scarf 75x75', 'sellable', 'pcs', 'scarf'::public.product_type, '75x75', 30, 'Initial inventory item seeded on 2026-04-02.'),
  ('pillow_45x45_printed', 'Printed pillow 45x45', 'sellable', 'pcs', 'pillow'::public.product_type, '45x45', 25, 'Initial inventory item seeded on 2026-04-02.'),
  ('phone_case_printed', 'Printed phone case', 'sellable', 'pcs', 'phone_case'::public.product_type, null, 20, 'Initial inventory item seeded on 2026-04-02.'),
  ('handbag_printed', 'Printed handbag', 'sellable', 'pcs', 'handbag'::public.product_type, '37x42', 35, 'Initial inventory item seeded on 2026-04-02.'),
  ('table_runner_35x145_printed', 'Printed table runner 35x145', 'sellable', 'pcs', 'table_runner'::public.product_type, '35x145', 30, 'Initial inventory item seeded on 2026-04-02.'),
  ('table_runner_50x200_printed', 'Printed table runner 50x200', 'sellable', 'pcs', 'table_runner'::public.product_type, '50x200', 50, 'Initial inventory item seeded on 2026-04-02.'),
  ('tablecloth_round_110x110_printed', 'Printed round tablecloth 110x110', 'sellable', 'pcs', 'tablecloth_round'::public.product_type, '110x110', 50, 'Initial inventory item seeded on 2026-04-02.'),
  ('tablecloth_round_130x130_printed', 'Printed round tablecloth 130x130', 'sellable', 'pcs', 'tablecloth_round'::public.product_type, '130x130', 90, 'Initial inventory item seeded on 2026-04-02.'),
  ('tablecloth_square_110x110_printed', 'Printed rectangular tablecloth 110x110', 'sellable', 'pcs', 'tablecloth_square'::public.product_type, '110x110', 50, 'Initial inventory item seeded on 2026-04-02.'),
  ('tablecloth_square_130x130_printed', 'Printed rectangular tablecloth 130x130', 'sellable', 'pcs', 'tablecloth_square'::public.product_type, '130x130', 90, 'Initial inventory item seeded on 2026-04-02.'),
  ('tablecloth_square_140x200_printed', 'Printed rectangular tablecloth 140x200', 'sellable', 'pcs', 'tablecloth_square'::public.product_type, '140x200', 150, 'Initial inventory item seeded on 2026-04-02.'),
  ('tablecloth_square_140x240_printed', 'Printed rectangular tablecloth 140x240', 'sellable', 'pcs', 'tablecloth_square'::public.product_type, '140x240', 175, 'Initial inventory item seeded on 2026-04-02.')
on conflict (code) do nothing;

insert into public.inventory_items (
  code,
  name,
  item_kind,
  unit,
  packaging_catalog_id,
  default_unit_cost,
  notes
)
select
  'paper_pillow_packaging',
  'Paper pillow packaging',
  'packaging',
  'pcs',
  packaging.id,
  packaging.unit_cost,
  'Initial inventory item seeded on 2026-04-02.'
from public.packaging_catalog as packaging
where packaging.code = 'paper_pillow'
on conflict (code) do nothing;

insert into public.inventory_items (
  code,
  name,
  item_kind,
  unit,
  notes
)
values
  ('paper_box_packaging', 'Paper box', 'packaging', 'pcs', 'Initial inventory item seeded on 2026-04-02.'),
  ('gift_bag_packaging', 'Gift bag', 'packaging', 'pcs', 'Initial inventory item seeded on 2026-04-02.'),
  ('sticker_insert', 'Sticker insert', 'gift', 'pcs', 'Initial inventory item seeded on 2026-04-02.')
on conflict (code) do nothing;
