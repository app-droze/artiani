alter table public.orders
  add column if not exists idempotency_key text;

create unique index if not exists orders_idempotency_key_unique
  on public.orders (idempotency_key)
  where idempotency_key is not null;

comment on column public.orders.idempotency_key is
  'Client-generated key used to make order creation idempotent across retries and refreshes.';
