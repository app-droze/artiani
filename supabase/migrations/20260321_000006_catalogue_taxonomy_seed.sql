insert into public.catalogue_categories (slug, sort_order, is_active)
values
  ('works', 10, true),
  ('tablecloth', 20, true),
  ('table_runner', 30, true),
  ('headscarf', 40, true),
  ('pillow', 50, true),
  ('bag', 60, true),
  ('other', 70, true)
on conflict (slug) do update
set
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

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
insert into public.catalogue_category_translations (category_id, lang, name, description)
values
  ((select id from category_seed where slug = 'works'), 'ka', 'ნამუშევრები', 'ლევან მარგიანის ნამუშევრები, რომლებიც როგორც სრულფასოვანი საკატალოგო პროდუქტი, ისე იყიდება.'),
  ((select id from category_seed where slug = 'works'), 'en', 'Works', 'Sellable works by Levan Margiani presented inside the same product catalogue as the rest of the collection.'),
  ((select id from category_seed where slug = 'works'), 'ru', 'Работы', 'Продаваемые работы Левана Маргиани, представленные внутри общего товарного каталога.'),

  ((select id from category_seed where slug = 'tablecloth'), 'ka', 'სუფრა', 'მაგიდის სუფრები სხვადასხვა ფორმითა და ზომით, მათ შორის მრგვალი და მართკუთხა ვერსიებით.'),
  ((select id from category_seed where slug = 'tablecloth'), 'en', 'Tablecloth', 'Tablecloths in multiple forms and sizes, including round and rectangular variants under one category.'),
  ((select id from category_seed where slug = 'tablecloth'), 'ru', 'Скатерть', 'Скатерти в разных формах и размерах, включая круглые и прямоугольные варианты внутри одной категории.'),

  ((select id from category_seed where slug = 'table_runner'), 'ka', 'მაგიდის რანერი', 'მაგიდისთვის შექმნილი ტექსტილის რანერები, რომლებიც ორნამენტსა და მასალაზეა აგებული.'),
  ((select id from category_seed where slug = 'table_runner'), 'en', 'Table Runner', 'Textile table runners built around ornament, material, and compact decorative use on the table.'),
  ((select id from category_seed where slug = 'table_runner'), 'ru', 'Дорожка', 'Текстильные дорожки для стола, построенные вокруг орнамента, материала и декоративного акцента.'),

  ((select id from category_seed where slug = 'headscarf'), 'ka', 'თავსაფარი', 'ტექსტილის თავსაფრები და მსგავსი ტარებადი ნამუშევრები, შექმნილი არტიანის ვიზუალური ენის ფარგლებში.'),
  ((select id from category_seed where slug = 'headscarf'), 'en', 'Headscarf', 'Headscarves and related wearable textile pieces created within the Artiani visual language.'),
  ((select id from category_seed where slug = 'headscarf'), 'ru', 'Платок', 'Платки и родственные носимые текстильные предметы, созданные в визуальном языке Artiani.'),

  ((select id from category_seed where slug = 'pillow'), 'ka', 'ბალიში', 'დეკორატიული ბალიშები და მსგავსი რბილი ინტერიერის ტექსტილის ნივთები.'),
  ((select id from category_seed where slug = 'pillow'), 'en', 'Pillow', 'Decorative pillows and related soft interior textile objects.'),
  ((select id from category_seed where slug = 'pillow'), 'ru', 'Подушка', 'Декоративные подушки и родственные мягкие предметы интерьерного текстиля.'),

  ((select id from category_seed where slug = 'bag'), 'ka', 'ჩანთა', 'ტექსტილის ჩანთები და მსგავსი სატარებელი ნივთები, რომლებიც მომავალში ამავე კატეგორიაში გაერთიანდება.'),
  ((select id from category_seed where slug = 'bag'), 'en', 'Bag', 'Textile bags and related carry items that will share the same sellable category.'),
  ((select id from category_seed where slug = 'bag'), 'ru', 'Сумка', 'Текстильные сумки и родственные носимые предметы, объединённые в одной товарной категории.'),

  ((select id from category_seed where slug = 'other'), 'ka', 'სხვა', 'სხვა მცირე ზომის ან დამხმარე ნივთები, რომლებიც არ საჭიროებს საკუთარ ზედა დონის კატეგორიას.'),
  ((select id from category_seed where slug = 'other'), 'en', 'Other', 'Smaller or supporting sellable items that do not need a dedicated top-level category.'),
  ((select id from category_seed where slug = 'other'), 'ru', 'Другое', 'Небольшие или вспомогательные продаваемые предметы, которым не нужна отдельная верхнеуровневая категория.')
on conflict (category_id, lang) do update
set
  name = excluded.name,
  description = excluded.description;
