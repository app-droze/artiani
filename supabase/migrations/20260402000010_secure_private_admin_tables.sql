alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.product_cost_rules enable row level security;
alter table public.business_expenses enable row level security;
alter table public.packaging_catalog enable row level security;
alter table public.order_delivery_costs enable row level security;
alter table public.order_misc_costs enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;

drop table if exists public.order_packaging_usage;

revoke all privileges on table public.orders from anon, authenticated;
revoke all privileges on table public.order_items from anon, authenticated;
revoke all privileges on table public.product_cost_rules from anon, authenticated;
revoke all privileges on table public.business_expenses from anon, authenticated;
revoke all privileges on table public.packaging_catalog from anon, authenticated;
revoke all privileges on table public.order_delivery_costs from anon, authenticated;
revoke all privileges on table public.order_misc_costs from anon, authenticated;
revoke all privileges on table public.inventory_items from anon, authenticated;
revoke all privileges on table public.inventory_movements from anon, authenticated;

revoke all privileges on table public.reporting_order_lines_v1 from anon, authenticated;
revoke all privileges on table public.reporting_order_line_item_profit_v1 from anon, authenticated;
revoke all privileges on table public.reporting_daily_sales_v1 from anon, authenticated;
revoke all privileges on table public.reporting_monthly_finance_v1 from anon, authenticated;
revoke all privileges on table public.reporting_order_fulfillment_costs_v1 from anon, authenticated;
revoke all privileges on table public.reporting_inventory_position_v1 from anon, authenticated;
revoke all privileges on table public.reporting_inventory_summary_v1 from anon, authenticated;

comment on table public.orders is
  'Private transactional orders table. Access is restricted to service-role and privileged server-side flows.';

comment on table public.order_items is
  'Private transactional order-line table. Access is restricted to service-role and privileged server-side flows.';

comment on table public.product_cost_rules is
  'Private admin-managed cost rule table used for profit reporting.';

comment on table public.business_expenses is
  'Private admin-managed operating expense ledger.';

comment on table public.packaging_catalog is
  'Private admin-managed packaging master data mirrored into inventory.';

comment on table public.order_delivery_costs is
  'Private admin-managed courier payout ledger per order.';

comment on table public.order_misc_costs is
  'Private admin-managed exceptional order-cost ledger.';

comment on table public.inventory_items is
  'Private admin-managed inventory catalog for products, packaging, and gifts.';

comment on table public.inventory_movements is
  'Private admin-managed inventory movement ledger.';
