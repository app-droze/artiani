create unique index if not exists product_themes_one_primary_per_product_idx
on public.product_themes (product_id)
where is_primary = true;
