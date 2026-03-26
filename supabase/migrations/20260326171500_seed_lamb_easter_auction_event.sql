do $$
declare
  target_product_slug constant text := 'painting-lamb-easter';
  target_status constant text := 'live';
  target_starts_at constant timestamptz := now();
  target_ends_at constant timestamptz := '2026-04-10 15:00:00+04';
  target_starting_bid constant numeric := 400;
  target_minimum_increment constant numeric := 10;
  target_winner_payment_deadline_hours constant integer := 24;
  target_product_id uuid;
begin
  select products.id
  into target_product_id
  from public.products as products
  where products.slug = target_product_slug
  limit 1;

  if target_product_id is null then
    raise exception 'Auction seed product not found for slug: %', target_product_slug;
  end if;

  insert into public.auction_events (
    product_id,
    status,
    starts_at,
    ends_at,
    starting_bid,
    minimum_increment,
    winner_payment_deadline_hours
  )
  select
    target_product_id,
    target_status,
    target_starts_at,
    target_ends_at,
    target_starting_bid,
    target_minimum_increment,
    target_winner_payment_deadline_hours
  where not exists (
    select 1
    from public.auction_events as events
    where events.product_id = target_product_id
      and events.status in ('draft', 'scheduled', 'live', 'winner_pending_payment')
  );
end
$$;
