update public.catalogue_collection_translations as translations
set name = case
  when collections.slug in ('couple', 'qajarebi') and translations.lang = 'ka' then 'ყაჯარები'
  when collections.slug in ('couple', 'qajarebi') and translations.lang = 'en' then 'Kajari Couple'
  else translations.name
end
from public.catalogue_collections as collections
where translations.collection_id = collections.id
  and collections.slug in ('couple', 'qajarebi')
  and translations.lang in ('ka', 'en');
