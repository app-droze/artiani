create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null,
  customer_name text not null,
  email text not null,
  phone text,
  address text,
  note text,
  status public.order_status not null default 'pending',
  total_amount numeric not null,
  currency text not null default 'GEL',
  lang public.lang_code not null default 'ka',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  product_id uuid references public.products(id),
  variant_id uuid references public.product_variants(id),
  qty integer not null,
  unit_price numeric not null,
  line_total numeric not null,
  snapshot_title text not null,
  snapshot_variant text,
  created_at timestamptz not null default now()
);

comment on table public.orders is
  'Live contract reconstructed from current Supabase OpenAPI metadata on 2026-03-20.';

comment on table public.order_items is
  'Live contract reconstructed from current Supabase OpenAPI metadata on 2026-03-20.';

comment on column public.orders.order_code is
  'App code assumes order_code lookup and collision retry semantics. Live uniqueness/default generation could not be fully confirmed from available metadata.';

comment on column public.orders.status is
  'Current app-supported values: pending, paid, processing, shipped, completed, cancelled, awaiting_payment.';

-- No additional exact unique constraints, non-PK indexes, RLS policies, or triggers
-- were confirmed for orders/order_items by the SQL evidence available during
-- schema reconstruction, so they are intentionally not recreated here.
