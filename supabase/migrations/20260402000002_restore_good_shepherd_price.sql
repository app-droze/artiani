do $$
declare
  good_shepherd_product_id uuid;
begin
  select id
  into good_shepherd_product_id
  from public.products
  where slug = 'painting-good-shepherd'
  limit 1;

  if good_shepherd_product_id is not null then
    update public.product_variants
    set price = 750
    where product_id = good_shepherd_product_id;
  end if;
end
$$;
