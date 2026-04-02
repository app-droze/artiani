drop view if exists public.reporting_monthly_finance_v1;
drop view if exists public.reporting_daily_sales_v1;
drop view if exists public.reporting_order_line_item_profit_v1;

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
),
line_finance as (
  select
    matched_lines.*,
    matched_lines.cost_rule_id is not null as has_cost_rule,
    matched_lines.unit_cost as unit_cost_amount,
    matched_lines.unit_cost * matched_lines.qty as raw_line_cost_amount,
    fulfillment_costs.delivery_cost_amount as raw_order_delivery_cost_amount,
    fulfillment_costs.misc_cost_amount as raw_order_misc_cost_amount,
    fulfillment_costs.fulfillment_cost_amount as raw_order_fulfillment_cost_amount,
    fulfillment_costs.has_explicit_delivery_cost,
    case
      when matched_lines.order_subtotal_amount > 0
        then round((fulfillment_costs.delivery_cost_amount * matched_lines.line_revenue_amount) / matched_lines.order_subtotal_amount, 2)
      else 0::numeric
    end as raw_allocated_delivery_cost_amount,
    case
      when matched_lines.order_subtotal_amount > 0
        then round((fulfillment_costs.misc_cost_amount * matched_lines.line_revenue_amount) / matched_lines.order_subtotal_amount, 2)
      else 0::numeric
    end as raw_allocated_misc_cost_amount,
    case
      when matched_lines.order_subtotal_amount > 0
        then round((fulfillment_costs.fulfillment_cost_amount * matched_lines.line_revenue_amount) / matched_lines.order_subtotal_amount, 2)
      else 0::numeric
    end as raw_allocated_fulfillment_cost_amount,
    matched_lines.order_status in ('paid', 'processing', 'shipped', 'completed') as is_sale_recognized,
    matched_lines.order_status in ('shipped', 'completed') as is_delivery_recognized
  from matched_lines
  left join fulfillment_costs
    on fulfillment_costs.order_id = matched_lines.order_id
)
select
  line_finance.*,
  case
    when line_finance.is_sale_recognized
      then line_finance.allocated_shipping_amount
    else 0::numeric
  end as recognized_allocated_shipping_amount,
  case
    when line_finance.is_sale_recognized
      then line_finance.line_revenue_amount
    else 0::numeric
  end as recognized_line_revenue_amount,
  case
    when line_finance.is_sale_recognized
      then line_finance.line_revenue_with_shipping_amount
    else 0::numeric
  end as recognized_line_revenue_with_shipping_amount,
  case
    when line_finance.is_sale_recognized
      then line_finance.raw_line_cost_amount
    else 0::numeric
  end as recognized_line_cost_amount,
  case
    when line_finance.is_delivery_recognized
      then line_finance.raw_order_delivery_cost_amount
    else 0::numeric
  end as recognized_order_delivery_cost_amount,
  case
    when line_finance.is_sale_recognized
      then line_finance.raw_order_misc_cost_amount
    else 0::numeric
  end as recognized_order_misc_cost_amount,
  case
    when line_finance.is_sale_recognized
      then
        coalesce(
          case
            when line_finance.is_delivery_recognized
              then line_finance.raw_order_delivery_cost_amount
            else 0::numeric
          end,
          0::numeric
        ) + coalesce(line_finance.raw_order_misc_cost_amount, 0::numeric)
    else 0::numeric
  end as recognized_order_fulfillment_cost_amount,
  case
    when line_finance.is_delivery_recognized
      then line_finance.raw_allocated_delivery_cost_amount
    else 0::numeric
  end as recognized_allocated_delivery_cost_amount,
  case
    when line_finance.is_sale_recognized
      then line_finance.raw_allocated_misc_cost_amount
    else 0::numeric
  end as recognized_allocated_misc_cost_amount,
  case
    when line_finance.is_sale_recognized
      then
        coalesce(
          case
            when line_finance.is_delivery_recognized
              then line_finance.raw_allocated_delivery_cost_amount
            else 0::numeric
          end,
          0::numeric
        ) + coalesce(line_finance.raw_allocated_misc_cost_amount, 0::numeric)
    else 0::numeric
  end as recognized_allocated_fulfillment_cost_amount,
  case
    when not line_finance.is_sale_recognized
      then 0::numeric
    when line_finance.raw_line_cost_amount is null
      then null
    else line_finance.line_revenue_amount - line_finance.raw_line_cost_amount
  end as recognized_line_profit_ex_shipping_amount,
  case
    when not line_finance.is_sale_recognized
      then 0::numeric
    when line_finance.raw_line_cost_amount is null
      then null
    else line_finance.line_revenue_with_shipping_amount - line_finance.raw_line_cost_amount
  end as recognized_line_gross_profit_amount,
  case
    when not line_finance.is_sale_recognized
      then 0::numeric
    when line_finance.raw_line_cost_amount is null
      then null
    else
      line_finance.line_revenue_with_shipping_amount -
      line_finance.raw_line_cost_amount -
      (
        coalesce(
          case
            when line_finance.is_delivery_recognized
              then line_finance.raw_allocated_delivery_cost_amount
            else 0::numeric
          end,
          0::numeric
        ) + coalesce(line_finance.raw_allocated_misc_cost_amount, 0::numeric)
      )
  end as recognized_line_profit_amount,
  case
    when not line_finance.is_sale_recognized or line_finance.raw_line_cost_amount is null
      then null
    when line_finance.line_revenue_with_shipping_amount > 0
      then round(
        (
          line_finance.line_revenue_with_shipping_amount -
          line_finance.raw_line_cost_amount -
          (
            coalesce(
              case
                when line_finance.is_delivery_recognized
                  then line_finance.raw_allocated_delivery_cost_amount
                else 0::numeric
              end,
              0::numeric
            ) + coalesce(line_finance.raw_allocated_misc_cost_amount, 0::numeric)
          )
        ) / line_finance.line_revenue_with_shipping_amount * 100,
        2
      )
    else null
  end as recognized_line_margin_percent,
  case
    when line_finance.is_sale_recognized
      then line_finance.raw_line_cost_amount
    else 0::numeric
  end as line_cost_amount,
  case
    when line_finance.is_delivery_recognized
      then line_finance.raw_order_delivery_cost_amount
    else 0::numeric
  end as order_delivery_cost_amount,
  case
    when line_finance.is_sale_recognized
      then line_finance.raw_order_misc_cost_amount
    else 0::numeric
  end as order_misc_cost_amount,
  case
    when line_finance.is_sale_recognized
      then
        coalesce(
          case
            when line_finance.is_delivery_recognized
              then line_finance.raw_order_delivery_cost_amount
            else 0::numeric
          end,
          0::numeric
        ) + coalesce(line_finance.raw_order_misc_cost_amount, 0::numeric)
    else 0::numeric
  end as order_fulfillment_cost_amount,
  case
    when line_finance.is_delivery_recognized
      then line_finance.raw_allocated_delivery_cost_amount
    else 0::numeric
  end as allocated_delivery_cost_amount,
  case
    when line_finance.is_sale_recognized
      then line_finance.raw_allocated_misc_cost_amount
    else 0::numeric
  end as allocated_misc_cost_amount,
  case
    when line_finance.is_sale_recognized
      then
        coalesce(
          case
            when line_finance.is_delivery_recognized
              then line_finance.raw_allocated_delivery_cost_amount
            else 0::numeric
          end,
          0::numeric
        ) + coalesce(line_finance.raw_allocated_misc_cost_amount, 0::numeric)
    else 0::numeric
  end as allocated_fulfillment_cost_amount,
  case
    when not line_finance.is_sale_recognized
      then 0::numeric
    when line_finance.raw_line_cost_amount is null
      then null
    else line_finance.line_revenue_amount - line_finance.raw_line_cost_amount
  end as line_profit_ex_shipping_amount,
  case
    when not line_finance.is_sale_recognized
      then 0::numeric
    when line_finance.raw_line_cost_amount is null
      then null
    else line_finance.line_revenue_with_shipping_amount - line_finance.raw_line_cost_amount
  end as line_gross_profit_amount,
  case
    when not line_finance.is_sale_recognized
      then 0::numeric
    when line_finance.raw_line_cost_amount is null
      then null
    else
      line_finance.line_revenue_with_shipping_amount -
      line_finance.raw_line_cost_amount -
      (
        coalesce(
          case
            when line_finance.is_delivery_recognized
              then line_finance.raw_allocated_delivery_cost_amount
            else 0::numeric
          end,
          0::numeric
        ) + coalesce(line_finance.raw_allocated_misc_cost_amount, 0::numeric)
      )
  end as line_profit_amount,
  case
    when not line_finance.is_sale_recognized or line_finance.raw_line_cost_amount is null
      then null
    when line_finance.line_revenue_with_shipping_amount > 0
      then round(
        (
          line_finance.line_revenue_with_shipping_amount -
          line_finance.raw_line_cost_amount -
          (
            coalesce(
              case
                when line_finance.is_delivery_recognized
                  then line_finance.raw_allocated_delivery_cost_amount
                else 0::numeric
              end,
              0::numeric
            ) + coalesce(line_finance.raw_allocated_misc_cost_amount, 0::numeric)
          )
        ) / line_finance.line_revenue_with_shipping_amount * 100,
        2
      )
    else null
  end as line_margin_percent
from line_finance;

comment on view public.reporting_order_line_item_profit_v1 is
  'Reporting order lines with recognized finance columns: revenue and product cost count after payment/processing, while courier only counts after shipped/completed. Raw order line values remain available from reporting_order_lines_v1.';

create view public.reporting_daily_sales_v1 as
select
  order_date,
  count(distinct order_id) filter (where is_sale_recognized) as order_count,
  count(*) filter (where is_sale_recognized) as line_count,
  coalesce(sum(qty) filter (where is_sale_recognized), 0) as units_sold,
  coalesce(sum(recognized_line_revenue_amount), 0) as product_revenue_amount,
  coalesce(sum(recognized_allocated_shipping_amount), 0) as shipping_revenue_amount,
  coalesce(sum(recognized_line_revenue_with_shipping_amount), 0) as gross_revenue_amount,
  coalesce(sum(line_cost_amount) filter (where has_cost_rule), 0) as known_cogs_amount,
  coalesce(sum(allocated_delivery_cost_amount) filter (where has_cost_rule), 0) as known_fulfillment_cost_amount,
  coalesce(sum(allocated_misc_cost_amount) filter (where has_cost_rule), 0) as known_misc_cost_amount,
  coalesce(sum(line_gross_profit_amount) filter (where has_cost_rule), 0) as known_gross_profit_amount,
  coalesce(sum(line_profit_amount) filter (where has_cost_rule), 0) as known_order_profit_amount,
  count(*) filter (where is_sale_recognized and not has_cost_rule) as lines_missing_cost_rule
from public.reporting_order_line_item_profit_v1
group by order_date
order by order_date desc;

comment on view public.reporting_daily_sales_v1 is
  'Daily finance rollup using recognized sales statuses (paid/processing/shipped/completed) and recognizing courier only after shipped/completed.';

create view public.reporting_monthly_finance_v1 as
with sales as (
  select
    date_trunc('month', order_date)::date as finance_month,
    count(distinct order_id) filter (where is_sale_recognized) as order_count,
    coalesce(sum(qty) filter (where is_sale_recognized), 0) as units_sold,
    coalesce(sum(recognized_line_revenue_amount), 0) as product_revenue_amount,
    coalesce(sum(recognized_allocated_shipping_amount), 0) as shipping_revenue_amount,
    coalesce(sum(recognized_line_revenue_with_shipping_amount), 0) as gross_revenue_amount,
    coalesce(sum(line_cost_amount) filter (where has_cost_rule), 0) as known_cogs_amount,
    coalesce(sum(allocated_delivery_cost_amount) filter (where has_cost_rule), 0) as known_fulfillment_cost_amount,
    coalesce(sum(allocated_misc_cost_amount) filter (where has_cost_rule), 0) as known_misc_cost_amount,
    coalesce(sum(line_gross_profit_amount) filter (where has_cost_rule), 0) as known_gross_profit_amount,
    coalesce(sum(line_profit_amount) filter (where has_cost_rule), 0) as known_order_profit_amount,
    count(*) filter (where is_sale_recognized and not has_cost_rule) as lines_missing_cost_rule
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
  coalesce(sales.known_misc_cost_amount, 0) as known_misc_cost_amount,
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
  'Monthly finance rollup with revenue/product cost recognized only after paid-plus statuses and courier recognized only after shipped/completed.';
