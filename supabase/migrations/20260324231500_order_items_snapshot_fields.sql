alter table public.order_items
  add column if not exists snapshot_title_en text,
  add column if not exists snapshot_title_ka text,
  add column if not exists snapshot_product_slug text,
  add column if not exists snapshot_product_type text,
  add column if not exists snapshot_image_url text;

comment on column public.order_items.snapshot_title_en is
  'Order-time English product title snapshot for stable historical rendering.';

comment on column public.order_items.snapshot_title_ka is
  'Order-time Georgian product title snapshot for stable historical rendering.';

comment on column public.order_items.snapshot_product_slug is
  'Order-time product slug snapshot used for stable links and display logic.';

comment on column public.order_items.snapshot_product_type is
  'Order-time product type snapshot used for stable historical labels.';

comment on column public.order_items.snapshot_image_url is
  'Order-time product image URL snapshot used for stable historical rendering.';
