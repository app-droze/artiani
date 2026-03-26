with product_theme_seed (product_slug, theme_slug, is_primary, sort_order) as (
  values
    ('bag-couple', 'qajarebi', true, 0),
    ('case-couple', 'qajarebi', true, 0),
    ('pillow-couple', 'qajarebi', true, 0),
    ('qajarebi', 'qajarebi', true, 0),
    ('table-runner-couple', 'qajarebi', true, 0),
    ('table-runner-large-couple', 'qajarebi', true, 0),

    ('bag-family', 'family', true, 0),
    ('case-family', 'family', true, 0),
    ('pillow-family', 'family', true, 0),
    ('table-runner-family', 'family', true, 0),
    ('table-runner-large-family-garden', 'family', true, 0),

    ('bag-kajari', 'qajari', true, 0),
    ('case-kajari', 'qajari', true, 0),
    ('qajari', 'qajari', true, 0),
    ('table-runner-kajari', 'qajari', true, 0),

    ('bag-lamb', 'lamb', true, 0),
    ('case-lamb', 'lamb', true, 0),
    ('cloth-rounded', 'lamb', true, 0),
    ('cloth-rectangular', 'lamb', true, 0),
    ('painting-lamb', 'lamb', true, 0),
    ('painting-lamb-easter', 'lamb', true, 0),
    ('pillow-lamb', 'lamb', true, 0),
    ('table-runner-lamb', 'lamb', true, 0),

    ('bag-shepherd', 'good_shepherd', true, 0),
    ('case-shepherd', 'good_shepherd', true, 0),
    ('painting-good-shepherd', 'good_shepherd', true, 0),
    ('pillow-shepherd', 'good_shepherd', true, 0),

    ('table-runner-large-family-garden', 'good_tree_bad_tree', false, 10)
)
insert into public.product_themes (
  product_id,
  theme_id,
  is_primary,
  sort_order
)
select
  products.id,
  themes.id,
  seed.is_primary,
  seed.sort_order
from product_theme_seed as seed
join public.products as products
  on products.slug = seed.product_slug
join public.catalogue_themes as themes
  on themes.slug = seed.theme_slug
on conflict (product_id, theme_id) do update
set
  is_primary = excluded.is_primary,
  sort_order = excluded.sort_order;
