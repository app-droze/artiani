update public.product_translations as translations
set title = 'Qajari Couple'
from public.products as products
where translations.product_id = products.id
  and products.slug in (
    'qajarebi',
    'pillow-couple',
    'table-runner-large-couple',
    'table-runner-couple',
    'bag-couple',
    'case-couple'
  )
  and translations.lang = 'en'
  and translations.title = 'Kajari Couple';

update public.catalogue_collection_translations as translations
set name = 'Qajari Couple'
from public.catalogue_collections as collections
where translations.collection_id = collections.id
  and collections.slug in ('couple', 'qajarebi')
  and translations.lang = 'en'
  and translations.name = 'Kajari Couple';
