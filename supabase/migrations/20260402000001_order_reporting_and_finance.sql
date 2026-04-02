alter table public.orders
  add column if not exists subtotal_amount numeric,
  add column if not exists shipping_amount numeric,
  add column if not exists delivery_area text;

with order_subtotals as (
  select
    order_id,
    coalesce(sum(line_total), 0)::numeric as subtotal_amount
  from public.order_items
  group by order_id
)
update public.orders as orders
set
  subtotal_amount = coalesce(orders.subtotal_amount, order_subtotals.subtotal_amount, orders.total_amount, 0),
  shipping_amount = coalesce(
    orders.shipping_amount,
    greatest(
      coalesce(orders.total_amount, 0) - coalesce(order_subtotals.subtotal_amount, orders.subtotal_amount, orders.total_amount, 0),
      0
    ),
    0
  )
from order_subtotals
where orders.id = order_subtotals.order_id;

update public.orders
set
  subtotal_amount = coalesce(subtotal_amount, total_amount, 0),
  shipping_amount = coalesce(shipping_amount, greatest(coalesce(total_amount, 0) - coalesce(subtotal_amount, total_amount, 0), 0), 0)
where subtotal_amount is null
   or shipping_amount is null;

update public.orders
set delivery_area = case
  when shipping_amount = 5 then 'tbilisi'
  when shipping_amount = 10 then 'region'
  else delivery_area
end
where delivery_area is null;

alter table public.orders
  alter column subtotal_amount set default 0,
  alter column shipping_amount set default 0;

update public.orders
set
  subtotal_amount = coalesce(subtotal_amount, 0),
  shipping_amount = coalesce(shipping_amount, 0)
where subtotal_amount is null
   or shipping_amount is null;

alter table public.orders
  alter column subtotal_amount set not null,
  alter column shipping_amount set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_delivery_area_check'
      and connamespace = 'public'::regnamespace
  ) then
    alter table public.orders
    add constraint orders_delivery_area_check
    check (delivery_area is null or delivery_area in ('tbilisi', 'region'));
  end if;
end
$$;

comment on column public.orders.subtotal_amount is
  'Stored order-time subtotal before shipping so reporting does not need to recompute it from line items.';

comment on column public.orders.shipping_amount is
  'Stored order-time shipping revenue amount derived from the delivery area pricing at checkout.';

comment on column public.orders.delivery_area is
  'Checkout delivery bucket used to calculate shipping: tbilisi or region.';

alter table public.order_items
  add column if not exists snapshot_color_label text,
  add column if not exists snapshot_background_label text,
  add column if not exists snapshot_material_label text,
  add column if not exists snapshot_phone_model_code text,
  add column if not exists snapshot_phone_model_label text,
  add column if not exists snapshot_size_label text,
  add column if not exists snapshot_print_side text,
  add column if not exists snapshot_print_side_label text;

update public.order_items as order_items
set
  snapshot_color_label = coalesce(order_items.snapshot_color_label, variants.background_name, variants.variant_name, variants.ornament_name),
  snapshot_background_label = coalesce(order_items.snapshot_background_label, variants.background_name),
  snapshot_material_label = coalesce(order_items.snapshot_material_label, variants.material),
  snapshot_size_label = coalesce(order_items.snapshot_size_label, variants.size_label)
from public.product_variants as variants
where variants.id = order_items.variant_id
  and (
    order_items.snapshot_color_label is null
    or order_items.snapshot_background_label is null
    or order_items.snapshot_material_label is null
    or order_items.snapshot_size_label is null
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'order_items_snapshot_print_side_check'
      and connamespace = 'public'::regnamespace
  ) then
    alter table public.order_items
    add constraint order_items_snapshot_print_side_check
    check (snapshot_print_side is null or snapshot_print_side in ('one_sided', 'both_sided'));
  end if;
end
$$;

comment on column public.order_items.snapshot_color_label is
  'Order-time readable color/style label for reporting.';

comment on column public.order_items.snapshot_background_label is
  'Order-time readable background label for reporting.';

comment on column public.order_items.snapshot_material_label is
  'Order-time readable material label for reporting.';

comment on column public.order_items.snapshot_phone_model_code is
  'Order-time phone model code for phone case reporting and cost matching.';

comment on column public.order_items.snapshot_phone_model_label is
  'Order-time readable phone model label for reporting.';

comment on column public.order_items.snapshot_size_label is
  'Order-time readable size label for reporting.';

comment on column public.order_items.snapshot_print_side is
  'Order-time normalized print-side key used for reporting and cost matching.';

comment on column public.order_items.snapshot_print_side_label is
  'Order-time readable print-side label for reporting.';

create table if not exists public.product_cost_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  product_type public.product_type,
  product_id uuid references public.products(id),
  variant_id uuid references public.product_variants(id),
  material_label text,
  phone_model_code text,
  print_side text,
  size_label text,
  unit_cost numeric not null,
  currency text not null default 'GEL',
  effective_from date not null default current_date,
  effective_to date,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_cost_rules_scope_check
    check (product_type is not null or product_id is not null or variant_id is not null),
  constraint product_cost_rules_unit_cost_check
    check (unit_cost >= 0),
  constraint product_cost_rules_effective_range_check
    check (effective_to is null or effective_to >= effective_from),
  constraint product_cost_rules_print_side_check
    check (print_side is null or print_side in ('one_sided', 'both_sided'))
);

create index if not exists product_cost_rules_variant_idx
  on public.product_cost_rules (variant_id)
  where variant_id is not null;

create index if not exists product_cost_rules_product_idx
  on public.product_cost_rules (product_id)
  where product_id is not null;

create index if not exists product_cost_rules_product_type_idx
  on public.product_cost_rules (product_type)
  where product_type is not null;

comment on table public.product_cost_rules is
  'Flexible per-item cost rules that can match by product type, product, variant, and optional sellable options.';

create table if not exists public.business_expenses (
  id uuid primary key default gen_random_uuid(),
  incurred_on date not null default current_date,
  expense_category text not null,
  description text not null,
  amount numeric not null,
  currency text not null default 'GEL',
  vendor text,
  related_order_id uuid references public.orders(id),
  related_product_id uuid references public.products(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_expenses_amount_check
    check (amount >= 0)
);

create index if not exists business_expenses_incurred_on_idx
  on public.business_expenses (incurred_on);

create index if not exists business_expenses_related_order_idx
  on public.business_expenses (related_order_id)
  where related_order_id is not null;

comment on table public.business_expenses is
  'Manual operating-expense ledger for analytics beyond per-order product costs.';

drop view if exists public.reporting_monthly_finance_v1;
drop view if exists public.reporting_daily_sales_v1;
drop view if exists public.reporting_order_line_item_profit_v1;
drop view if exists public.reporting_order_lines_v1;

create view public.reporting_order_lines_v1 as
select
  orders.id as order_id,
  order_items.id as order_item_id,
  row_number() over (
    partition by orders.id
    order by order_items.created_at asc, order_items.id asc
  ) as order_item_number,
  (orders.created_at at time zone 'Asia/Tbilisi')::date as order_date,
  orders.created_at at time zone 'Asia/Tbilisi' as order_created_at_local,
  orders.created_at as order_created_at_utc,
  orders.order_code,
  orders.status as order_status,
  orders.payment_method,
  orders.lang as order_lang,
  orders.customer_name,
  orders.email as customer_email,
  orders.phone as customer_phone,
  orders.address as customer_address,
  orders.delivery_area,
  orders.subtotal_amount as order_subtotal_amount,
  orders.shipping_amount as order_shipping_amount,
  orders.total_amount as order_total_amount,
  orders.currency,
  order_items.product_id,
  order_items.variant_id,
  coalesce(order_items.snapshot_product_slug, products.slug) as product_slug,
  coalesce(order_items.snapshot_product_type, products.product_type::text, 'unknown') as product_type,
  coalesce(
    case
      when orders.lang = 'ka' then order_items.snapshot_title_ka
      else order_items.snapshot_title_en
    end,
    order_items.snapshot_title_ka,
    order_items.snapshot_title_en,
    order_items.snapshot_title,
    product_title_ka.title,
    product_title_en.title,
    products.slug
  ) as product_name,
  coalesce(order_items.snapshot_title_en, product_title_en.title, order_items.snapshot_title) as product_name_en,
  coalesce(order_items.snapshot_title_ka, product_title_ka.title, order_items.snapshot_title) as product_name_ka,
  variants.sku as variant_sku,
  variants.variant_name,
  coalesce(order_items.snapshot_color_label, variants.background_name, variants.variant_name, variants.ornament_name) as product_color,
  coalesce(order_items.snapshot_background_label, variants.background_name) as product_background,
  coalesce(order_items.snapshot_material_label, variants.material) as product_material,
  order_items.snapshot_phone_model_code as phone_model_code,
  coalesce(order_items.snapshot_phone_model_label, phone_models.name) as phone_model,
  phone_models.brand as phone_model_brand,
  coalesce(order_items.snapshot_size_label, variants.size_label) as product_size,
  order_items.snapshot_print_side as print_side_key,
  coalesce(
    order_items.snapshot_print_side_label,
    case
      when order_items.snapshot_print_side = 'one_sided' then 'One sided'
      when order_items.snapshot_print_side = 'both_sided' then 'Both sided'
      else null
    end
  ) as print_side,
  coalesce(
    order_items.snapshot_variant,
    concat_ws(
      ' · ',
      coalesce(order_items.snapshot_color_label, variants.background_name, variants.variant_name, variants.ornament_name),
      case
        when coalesce(order_items.snapshot_background_label, variants.background_name) is distinct from
             coalesce(order_items.snapshot_color_label, variants.background_name, variants.variant_name, variants.ornament_name)
          then coalesce(order_items.snapshot_background_label, variants.background_name)
        else null
      end,
      coalesce(order_items.snapshot_material_label, variants.material),
      coalesce(order_items.snapshot_phone_model_label, phone_models.name),
      coalesce(order_items.snapshot_size_label, variants.size_label),
      coalesce(
        order_items.snapshot_print_side_label,
        case
          when order_items.snapshot_print_side = 'one_sided' then 'One sided'
          when order_items.snapshot_print_side = 'both_sided' then 'Both sided'
          else null
        end
      )
    )
  ) as selected_options,
  order_items.qty,
  order_items.unit_price,
  order_items.line_total as line_revenue_amount,
  case
    when orders.subtotal_amount > 0
      then round((orders.shipping_amount * order_items.line_total) / orders.subtotal_amount, 2)
    else 0::numeric
  end as allocated_shipping_amount,
  order_items.line_total +
    case
      when orders.subtotal_amount > 0
        then round((orders.shipping_amount * order_items.line_total) / orders.subtotal_amount, 2)
      else 0::numeric
    end as line_revenue_with_shipping_amount
from public.orders as orders
join public.order_items as order_items
  on order_items.order_id = orders.id
left join public.products as products
  on products.id = order_items.product_id
left join public.product_variants as variants
  on variants.id = order_items.variant_id
left join public.product_translations as product_title_en
  on product_title_en.product_id = order_items.product_id
 and product_title_en.lang = 'en'
left join public.product_translations as product_title_ka
  on product_title_ka.product_id = order_items.product_id
 and product_title_ka.lang = 'ka'
left join public.catalogue_phone_models as phone_models
  on phone_models.code = order_items.snapshot_phone_model_code;

comment on view public.reporting_order_lines_v1 is
  'Readable one-row-per-order-item export view for spreadsheets and admin analysis.';

create view public.reporting_order_line_item_profit_v1 as
with matched_lines as (
  select
    reporting_lines.*,
    matched_rule.id as cost_rule_id,
    matched_rule.name as cost_rule_name,
    matched_rule.unit_cost,
    matched_rule.currency as cost_currency
  from public.reporting_order_lines_v1 as reporting_lines
  left join lateral (
    select rules.*
    from public.product_cost_rules as rules
    where rules.is_active = true
      and rules.currency = reporting_lines.currency
      and reporting_lines.order_date >= rules.effective_from
      and (rules.effective_to is null or reporting_lines.order_date <= rules.effective_to)
      and (rules.variant_id is null or rules.variant_id = reporting_lines.variant_id)
      and (rules.product_id is null or rules.product_id = reporting_lines.product_id)
      and (rules.product_type is null or rules.product_type::text = reporting_lines.product_type)
      and (rules.material_label is null or lower(rules.material_label) = lower(coalesce(reporting_lines.product_material, '')))
      and (rules.phone_model_code is null or lower(rules.phone_model_code) = lower(coalesce(reporting_lines.phone_model_code, '')))
      and (rules.print_side is null or rules.print_side = coalesce(reporting_lines.print_side_key, ''))
      and (rules.size_label is null or lower(rules.size_label) = lower(coalesce(reporting_lines.product_size, '')))
    order by
      (
        (rules.variant_id is not null)::int +
        (rules.product_id is not null)::int +
        (rules.product_type is not null)::int +
        (rules.material_label is not null)::int +
        (rules.phone_model_code is not null)::int +
        (rules.print_side is not null)::int +
        (rules.size_label is not null)::int
      ) desc,
      rules.effective_from desc,
      rules.created_at desc
    limit 1
  ) as matched_rule
    on true
)
select
  matched_lines.*,
  matched_lines.cost_rule_id is not null as has_cost_rule,
  matched_lines.cost_rule_name,
  matched_lines.cost_currency,
  matched_lines.unit_cost as unit_cost_amount,
  matched_lines.unit_cost * matched_lines.qty as line_cost_amount,
  matched_lines.line_revenue_amount - (matched_lines.unit_cost * matched_lines.qty) as line_profit_ex_shipping_amount,
  matched_lines.line_revenue_with_shipping_amount - (matched_lines.unit_cost * matched_lines.qty) as line_profit_amount,
  case
    when matched_lines.line_revenue_with_shipping_amount > 0 and matched_lines.unit_cost is not null
      then round(
        ((matched_lines.line_revenue_with_shipping_amount - (matched_lines.unit_cost * matched_lines.qty))
          / matched_lines.line_revenue_with_shipping_amount) * 100,
        2
      )
    else null
  end as line_margin_percent
from matched_lines;

comment on view public.reporting_order_line_item_profit_v1 is
  'Reporting order lines with best-match item cost rules and gross-profit calculations.';

create view public.reporting_daily_sales_v1 as
with order_totals as (
  select
    (created_at at time zone 'Asia/Tbilisi')::date as order_date,
    count(*) as order_count,
    sum(subtotal_amount) as product_revenue_amount,
    sum(shipping_amount) as shipping_revenue_amount,
    sum(total_amount) as gross_revenue_amount
  from public.orders
  group by 1
),
line_totals as (
  select
    order_date,
    sum(qty) as units_sold,
    count(*) as line_count,
    count(*) filter (where not has_cost_rule) as lines_missing_cost_rule,
    sum(line_cost_amount) filter (where has_cost_rule) as known_cogs_amount,
    sum(line_profit_amount) filter (where has_cost_rule) as known_gross_profit_amount
  from public.reporting_order_line_item_profit_v1
  group by 1
)
select
  order_totals.order_date,
  order_totals.order_count,
  coalesce(line_totals.line_count, 0) as line_count,
  coalesce(line_totals.units_sold, 0) as units_sold,
  order_totals.product_revenue_amount,
  order_totals.shipping_revenue_amount,
  order_totals.gross_revenue_amount,
  coalesce(line_totals.known_cogs_amount, 0) as known_cogs_amount,
  coalesce(line_totals.known_gross_profit_amount, 0) as known_gross_profit_amount,
  coalesce(line_totals.lines_missing_cost_rule, 0) as lines_missing_cost_rule
from order_totals
left join line_totals
  on line_totals.order_date = order_totals.order_date
order by order_totals.order_date desc;

comment on view public.reporting_daily_sales_v1 is
  'Daily sales rollup with revenue totals and known gross profit based on populated cost rules.';

create view public.reporting_monthly_finance_v1 as
with sales as (
  select
    date_trunc('month', order_date)::date as finance_month,
    count(distinct order_id) as order_count,
    sum(qty) as units_sold,
    sum(line_revenue_amount) as product_revenue_amount,
    sum(allocated_shipping_amount) as shipping_revenue_amount,
    sum(line_revenue_with_shipping_amount) as gross_revenue_amount,
    sum(line_cost_amount) filter (where has_cost_rule) as known_cogs_amount,
    sum(line_profit_amount) filter (where has_cost_rule) as known_gross_profit_amount,
    count(*) filter (where not has_cost_rule) as lines_missing_cost_rule
  from public.reporting_order_line_item_profit_v1
  group by 1
),
expenses as (
  select
    date_trunc('month', incurred_on)::date as finance_month,
    sum(amount) as operating_expenses_amount
  from public.business_expenses
  group by 1
),
months as (
  select finance_month from sales
  union
  select finance_month from expenses
)
select
  months.finance_month,
  coalesce(sales.order_count, 0) as order_count,
  coalesce(sales.units_sold, 0) as units_sold,
  coalesce(sales.product_revenue_amount, 0) as product_revenue_amount,
  coalesce(sales.shipping_revenue_amount, 0) as shipping_revenue_amount,
  coalesce(sales.gross_revenue_amount, 0) as gross_revenue_amount,
  coalesce(sales.known_cogs_amount, 0) as known_cogs_amount,
  coalesce(sales.known_gross_profit_amount, 0) as known_gross_profit_amount,
  coalesce(expenses.operating_expenses_amount, 0) as operating_expenses_amount,
  coalesce(sales.known_gross_profit_amount, 0) - coalesce(expenses.operating_expenses_amount, 0) as known_net_profit_amount,
  coalesce(sales.lines_missing_cost_rule, 0) as lines_missing_cost_rule
from months
left join sales
  on sales.finance_month = months.finance_month
left join expenses
  on expenses.finance_month = months.finance_month
order by months.finance_month desc;

comment on view public.reporting_monthly_finance_v1 is
  'Monthly finance rollup combining order revenue, known COGS, and manual business expenses.';
