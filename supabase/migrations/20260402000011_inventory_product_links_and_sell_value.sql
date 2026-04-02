alter table public.inventory_items
  add column if not exists product_id uuid references public.products(id);

create index if not exists inventory_items_product_idx
  on public.inventory_items (product_id)
  where product_id is not null;

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
  items.product_id,
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
  'Current inventory position by item, including product linkage, on-hand quantity, and remaining stock value.';

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
