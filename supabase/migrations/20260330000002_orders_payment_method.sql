alter table public.orders
add column if not exists payment_method text;

update public.orders
set payment_method = 'bank_transfer'
where payment_method is null;

alter table public.orders
alter column payment_method set default 'bank_transfer';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_payment_method_check'
      and connamespace = 'public'::regnamespace
  ) then
    alter table public.orders
    add constraint orders_payment_method_check
    check (payment_method in ('bank_transfer', 'cash_on_delivery'));
  end if;
end
$$;

comment on column public.orders.payment_method is
  'How the customer is expected to pay for the order: bank transfer before fulfillment or cash on delivery.';
