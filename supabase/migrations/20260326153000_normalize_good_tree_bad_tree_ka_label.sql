update public.catalogue_theme_translations as translations
set name = 'ხე კეთილი, ხე ბოროტი'
from public.catalogue_themes as themes
where translations.theme_id = themes.id
  and themes.slug = 'good_tree_bad_tree'
  and translations.lang = 'ka';
