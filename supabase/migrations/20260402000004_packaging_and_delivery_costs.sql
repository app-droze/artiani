create table if not exists public.packaging_catalog (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  unit_cost numeric not null,
  currency text not null default 'GEL',
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packaging_catalog_code_key unique (code),
  constraint packaging_catalog_unit_cost_check
    check (unit_cost >= 0)
);

comment on table public.packaging_catalog is
  'Catalog of non-sellable packaging and gift inserts used during fulfillment.';

create table if not exists public.order_packaging_usage (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  packaging_id uuid references public.packaging_catalog(id),
  qty integer not null default 1,
  unit_cost numeric not null,
  currency text not null default 'GEL',
  packaging_code_snapshot text,
  packaging_name_snapshot text not null,
  notes text,
  created_at timestamptz not null default now(),
  constraint order_packaging_usage_qty_check
    check (qty > 0),
  constraint order_packaging_usage_unit_cost_check
    check (unit_cost >= 0)
);

create index if not exists order_packaging_usage_order_idx
  on public.order_packaging_usage (order_id);

comment on table public.order_packaging_usage is
  'Per-order record of the packaging components actually used during fulfillment.';

create table if not exists public.order_delivery_costs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  provider text,
  amount numeric not null,
  currency text not null default 'GEL',
  notes text,
  created_at timestamptz not null default now(),
  constraint order_delivery_costs_amount_check
    check (amount >= 0)
);

create index if not exists order_delivery_costs_order_idx
  on public.order_delivery_costs (order_id);

comment on table public.order_delivery_costs is
  'Actual courier or delivery spend per order. When empty, reporting defaults to the customer shipping charge as a pass-through courier cost.';

insert into public.packaging_catalog (
  code,
  name,
  unit_cost,
  currency,
  notes
)
select
  'paper_pillow',
  'Paper Pillow Packaging',
  3.5,
  'GEL',
  'Initial packaging item provided on 2026-04-02.'
where not exists (
  select 1
  from public.packaging_catalog
  where code = 'paper_pillow'
);

drop view if exists public.reporting_monthly_finance_v1;
drop view if exists public.reporting_daily_sales_v1;
drop view if exists public.reporting_order_line_item_profit_v1;
drop view if exists public.reporting_order_fulfillment_costs_v1;

create view public.reporting_order_fulfillment_costs_v1 as
with packaging_totals as (
  select
    order_id,
    sum(qty * unit_cost) as packaging_cost_amount
  from public.order_packaging_usage
  group by order_id
),
delivery_totals as (
  select
    orders.id as order_id,
    coalesce(sum(delivery_costs.amount), orders.shipping_amount, 0) as delivery_cost_amount,
    count(delivery_costs.id) > 0 as has_explicit_delivery_cost
  from public.orders as orders
  left join public.order_delivery_costs as delivery_costs
    on delivery_costs.order_id = orders.id
  group by orders.id, orders.shipping_amount
)
select
  orders.id as order_id,
  coalesce(packaging_totals.packaging_cost_amount, 0) as packaging_cost_amount,
  coalesce(delivery_totals.delivery_cost_amount, orders.shipping_amount, 0) as delivery_cost_amount,
  coalesce(packaging_totals.packaging_cost_amount, 0) + coalesce(delivery_totals.delivery_cost_amount, orders.shipping_amount, 0) as fulfillment_cost_amount,
  coalesce(delivery_totals.has_explicit_delivery_cost, false) as has_explicit_delivery_cost
from public.orders as orders
left join packaging_totals
  on packaging_totals.order_id = orders.id
left join delivery_totals
  on delivery_totals.order_id = orders.id;

comment on view public.reporting_order_fulfillment_costs_v1 is
  'Order-level packaging and delivery costs used to turn gross profit into true order contribution profit.';

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
),
fulfillment_costs as (
  select *
  from public.reporting_order_fulfillment_costs_v1
)
select
  matched_lines.*,
  matched_lines.cost_rule_id is not null as has_cost_rule,
  matched_lines.unit_cost as unit_cost_amount,
  matched_lines.unit_cost * matched_lines.qty as line_cost_amount,
  fulfillment_costs.packaging_cost_amount as order_packaging_cost_amount,
  fulfillment_costs.delivery_cost_amount as order_delivery_cost_amount,
  fulfillment_costs.fulfillment_cost_amount as order_fulfillment_cost_amount,
  fulfillment_costs.has_explicit_delivery_cost,
  case
    when matched_lines.order_subtotal_amount > 0
      then round((fulfillment_costs.packaging_cost_amount * matched_lines.line_revenue_amount) / matched_lines.order_subtotal_amount, 2)
    else 0::numeric
  end as allocated_packaging_cost_amount,
  case
    when matched_lines.order_subtotal_amount > 0
      then round((fulfillment_costs.delivery_cost_amount * matched_lines.line_revenue_amount) / matched_lines.order_subtotal_amount, 2)
    else 0::numeric
  end as allocated_delivery_cost_amount,
  case
    when matched_lines.order_subtotal_amount > 0
      then round((fulfillment_costs.fulfillment_cost_amount * matched_lines.line_revenue_amount) / matched_lines.order_subtotal_amount, 2)
    else 0::numeric
  end as allocated_fulfillment_cost_amount,
  matched_lines.line_revenue_amount - (matched_lines.unit_cost * matched_lines.qty) as line_profit_ex_shipping_amount,
  matched_lines.line_revenue_with_shipping_amount - (matched_lines.unit_cost * matched_lines.qty) as line_gross_profit_amount,
  matched_lines.line_revenue_with_shipping_amount -
    (matched_lines.unit_cost * matched_lines.qty) -
    case
      when matched_lines.order_subtotal_amount > 0
        then round((fulfillment_costs.fulfillment_cost_amount * matched_lines.line_revenue_amount) / matched_lines.order_subtotal_amount, 2)
      else 0::numeric
    end as line_profit_amount,
  case
    when matched_lines.line_revenue_with_shipping_amount > 0 and matched_lines.unit_cost is not null
      then round(
        (
          matched_lines.line_revenue_with_shipping_amount -
          (matched_lines.unit_cost * matched_lines.qty) -
          case
            when matched_lines.order_subtotal_amount > 0
              then round((fulfillment_costs.fulfillment_cost_amount * matched_lines.line_revenue_amount) / matched_lines.order_subtotal_amount, 2)
            else 0::numeric
          end
        ) / matched_lines.line_revenue_with_shipping_amount * 100,
        2
      )
    else null
  end as line_margin_percent
from matched_lines
left join fulfillment_costs
  on fulfillment_costs.order_id = matched_lines.order_id;

comment on view public.reporting_order_line_item_profit_v1 is
  'Reporting order lines with item cost rules plus packaging and courier fulfillment costs.';

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
    sum(allocated_fulfillment_cost_amount) filter (where has_cost_rule) as known_fulfillment_cost_amount,
    sum(line_gross_profit_amount) filter (where has_cost_rule) as known_gross_profit_amount,
    sum(line_profit_amount) filter (where has_cost_rule) as known_order_profit_amount
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
  coalesce(line_totals.known_fulfillment_cost_amount, 0) as known_fulfillment_cost_amount,
  coalesce(line_totals.known_gross_profit_amount, 0) as known_gross_profit_amount,
  coalesce(line_totals.known_order_profit_amount, 0) as known_order_profit_amount,
  coalesce(line_totals.lines_missing_cost_rule, 0) as lines_missing_cost_rule
from order_totals
left join line_totals
  on line_totals.order_date = order_totals.order_date
order by order_totals.order_date desc;

comment on view public.reporting_daily_sales_v1 is
  'Daily sales rollup with known COGS, packaging/courier fulfillment cost, and resulting order-level profit.';

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
    sum(allocated_fulfillment_cost_amount) filter (where has_cost_rule) as known_fulfillment_cost_amount,
    sum(line_gross_profit_amount) filter (where has_cost_rule) as known_gross_profit_amount,
    sum(line_profit_amount) filter (where has_cost_rule) as known_order_profit_amount,
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
  coalesce(sales.known_fulfillment_cost_amount, 0) as known_fulfillment_cost_amount,
  coalesce(sales.known_gross_profit_amount, 0) as known_gross_profit_amount,
  coalesce(sales.known_order_profit_amount, 0) as known_order_profit_amount,
  coalesce(expenses.operating_expenses_amount, 0) as operating_expenses_amount,
  coalesce(sales.known_order_profit_amount, 0) - coalesce(expenses.operating_expenses_amount, 0) as known_net_profit_amount,
  coalesce(sales.lines_missing_cost_rule, 0) as lines_missing_cost_rule
from months
left join sales
  on sales.finance_month = months.finance_month
left join expenses
  on expenses.finance_month = months.finance_month
order by months.finance_month desc;

comment on view public.reporting_monthly_finance_v1 is
  'Monthly finance rollup combining revenue, COGS, packaging/courier fulfillment cost, and operating expenses.';
