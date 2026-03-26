update public.product_translations as translations
set title = case
  when translations.lang = 'ka' then 'ყაჯარი'
  when translations.lang = 'en' then 'Qajari'
  else translations.title
end
from public.products as products
where translations.product_id = products.id
  and products.slug = 'bag-kajari'
  and translations.lang in ('ka', 'en');
