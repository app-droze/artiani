do $$
declare
  target_product_slug constant text := 'painting-lamb-easter';
  target_price constant numeric := 450;
  target_product_id uuid;
begin
  select products.id
  into target_product_id
  from public.products as products
  where products.slug = target_product_slug
  limit 1;

  if target_product_id is null then
    raise exception 'Fixed-sale target product not found for slug: %', target_product_slug;
  end if;

  update public.product_variants as variants
  set price = target_price
  where variants.product_id = target_product_id;

  update public.auction_events as events
  set
    status = 'cancelled',
    updated_at = now()
  where events.product_id = target_product_id
    and events.status in ('draft', 'scheduled', 'live', 'winner_pending_payment');
end
$$;
