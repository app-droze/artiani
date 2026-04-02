alter type public.stock_status add value if not exists 'reserved';

drop view if exists public.reporting_daily_sales_v1;

revoke all privileges on table public.reporting_order_lines_v1 from anon, authenticated;
revoke all privileges on table public.reporting_order_line_item_profit_v1 from anon, authenticated;
revoke all privileges on table public.reporting_monthly_finance_v1 from anon, authenticated;
revoke all privileges on table public.reporting_order_fulfillment_costs_v1 from anon, authenticated;
revoke all privileges on table public.reporting_inventory_position_v1 from anon, authenticated;
revoke all privileges on table public.reporting_inventory_summary_v1 from anon, authenticated;
