update public.product_variants
set price = 40
where product_id in (
  select id
  from public.products
  where product_type = 'phone_case'
);
