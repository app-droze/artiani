with painting_order_states as (
  select
    order_items.variant_id,
    max(
      case
        when orders.status in ('paid', 'processing', 'shipped', 'completed') then 2
        when orders.status in ('pending', 'awaiting_payment') then 1
        else 0
      end
    ) as state_rank
  from public.order_items
  join public.orders
    on orders.id = order_items.order_id
  where order_items.snapshot_product_type = 'painting'
    and order_items.variant_id is not null
  group by order_items.variant_id
)
update public.product_variants as variants
set stock_status =
  case painting_order_states.state_rank
    when 2 then 'out_of_stock'::public.stock_status
    when 1 then 'reserved'::public.stock_status
    else 'in_stock'::public.stock_status
  end
from painting_order_states
where variants.id = painting_order_states.variant_id
  and variants.stock_status is distinct from
    case painting_order_states.state_rank
      when 2 then 'out_of_stock'::public.stock_status
      when 1 then 'reserved'::public.stock_status
      else 'in_stock'::public.stock_status
    end;
