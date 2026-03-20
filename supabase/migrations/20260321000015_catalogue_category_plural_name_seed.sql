with category_seed as (
  select slug, id
  from public.catalogue_categories
  where slug in (
    'works',
    'tablecloth',
    'table_runner',
    'headscarf',
    'pillow',
    'bag',
    'other'
  )
)
update public.catalogue_category_translations as translations
set plural_name = seeded.plural_name
from (
  values
    ((select id from category_seed where slug = 'works'), 'ka'::public.lang_code, 'ნამუშევრები'),
    ((select id from category_seed where slug = 'works'), 'en'::public.lang_code, 'Works'),
    ((select id from category_seed where slug = 'works'), 'ru'::public.lang_code, 'Работы'),

    ((select id from category_seed where slug = 'tablecloth'), 'ka'::public.lang_code, 'სუფრები'),
    ((select id from category_seed where slug = 'tablecloth'), 'en'::public.lang_code, 'Tablecloths'),
    ((select id from category_seed where slug = 'tablecloth'), 'ru'::public.lang_code, 'Скатерти'),

    ((select id from category_seed where slug = 'table_runner'), 'ka'::public.lang_code, 'მაგიდის რანერები'),
    ((select id from category_seed where slug = 'table_runner'), 'en'::public.lang_code, 'Table Runners'),
    ((select id from category_seed where slug = 'table_runner'), 'ru'::public.lang_code, 'Дорожки'),

    ((select id from category_seed where slug = 'headscarf'), 'ka'::public.lang_code, 'თავსაფრები'),
    ((select id from category_seed where slug = 'headscarf'), 'en'::public.lang_code, 'Headscarves'),
    ((select id from category_seed where slug = 'headscarf'), 'ru'::public.lang_code, 'Платки'),

    ((select id from category_seed where slug = 'pillow'), 'ka'::public.lang_code, 'ბალიშები'),
    ((select id from category_seed where slug = 'pillow'), 'en'::public.lang_code, 'Pillows'),
    ((select id from category_seed where slug = 'pillow'), 'ru'::public.lang_code, 'Подушки'),

    ((select id from category_seed where slug = 'bag'), 'ka'::public.lang_code, 'ჩანთები'),
    ((select id from category_seed where slug = 'bag'), 'en'::public.lang_code, 'Bags'),
    ((select id from category_seed where slug = 'bag'), 'ru'::public.lang_code, 'Сумки'),

    ((select id from category_seed where slug = 'other'), 'ka'::public.lang_code, 'სხვა'),
    ((select id from category_seed where slug = 'other'), 'en'::public.lang_code, 'Other'),
    ((select id from category_seed where slug = 'other'), 'ru'::public.lang_code, 'Другое')
) as seeded(category_id, lang, plural_name)
where translations.category_id = seeded.category_id
  and translations.lang = seeded.lang;
