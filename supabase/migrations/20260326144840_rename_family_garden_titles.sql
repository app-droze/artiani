update public.product_translations as translations
set title = case
  when translations.lang = 'ka' then 'კომპოზიცია: ოჯახი, ხე კეთილი - ხე ბოროტი'
  when translations.lang = 'en' then 'Composition: Family, Good Tree and Bad Tree'
  else translations.title
end
from public.products as products
where translations.product_id = products.id
  and products.slug = 'table-runner-large-family-garden'
  and translations.lang in ('ka', 'en');
