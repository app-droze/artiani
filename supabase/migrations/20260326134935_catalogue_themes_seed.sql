insert into public.catalogue_themes (
  slug,
  sort_order,
  is_active
)
values
  ('lamb', 10, true),
  ('good_shepherd', 20, true),
  ('family', 30, true),
  ('qajari', 40, true),
  ('qajarebi', 50, true),
  ('good_tree_bad_tree', 60, true)
on conflict (slug) do update
set
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

with theme_seed as (
  select slug, id
  from public.catalogue_themes
  where slug in (
    'lamb',
    'good_shepherd',
    'family',
    'qajari',
    'qajarebi',
    'good_tree_bad_tree'
  )
)
insert into public.catalogue_theme_translations (
  theme_id,
  lang,
  name,
  short_description,
  story_text,
  symbolism_text
)
values
  ((select id from theme_seed where slug = 'lamb'), 'en', 'Lamb', 'Christian symbol of innocence, sacrifice, and salvation.', null, null),
  ((select id from theme_seed where slug = 'lamb'), 'ka', 'კრავი', 'ქრისტიანულ ხელოვნებაში უმანკოების, მსხვერპლისა და ხსნის სიმბოლო.', null, null),

  ((select id from theme_seed where slug = 'good_shepherd'), 'en', 'Good Shepherd', 'A Gospel image of guidance, care, and protection.', null, null),
  ((select id from theme_seed where slug = 'good_shepherd'), 'ka', 'მწყემსი კეთილი', 'სახარებისეული სახე მზრუნველობის, მფარველობისა და გზის მაჩვენებლისა.', null, null),

  ((select id from theme_seed where slug = 'family'), 'en', 'Family', 'A theme of closeness, tenderness, and sacred togetherness.', null, null),
  ((select id from theme_seed where slug = 'family'), 'ka', 'ოჯახი', 'სიახლოვის, სითბოსა და ერთობის თემა.', null, null),

  ((select id from theme_seed where slug = 'qajari'), 'en', 'Qajari', 'A refined courtly motif shaped by miniature tradition.', null, null),
  ((select id from theme_seed where slug = 'qajari'), 'ka', 'ყაჯარი', 'მინიატურულ ტრადიციასთან დაკავშირებული დახვეწილი სახე.', null, null),

  ((select id from theme_seed where slug = 'qajarebi'), 'en', 'Qajari Couple', 'A paired Qajari motif of intimacy, elegance, and presence.', null, null),
  ((select id from theme_seed where slug = 'qajarebi'), 'ka', 'ყაჯარები', 'წყვილის მოტივი — სიახლოვისა და დახვეწილი ყოფნის ნიშნით.', null, null),

  ((select id from theme_seed where slug = 'good_tree_bad_tree'), 'en', 'Good Tree and Bad Tree', 'A moral and spiritual image drawn from Gospel teaching.', null, null),
  ((select id from theme_seed where slug = 'good_tree_bad_tree'), 'ka', 'კარგი ხე და ცუდი ხე', 'სახარებისეულ სწავლებასთან დაკავშირებული ზნეობრივი და სულიერი სახე.', null, null)
on conflict (theme_id, lang) do update
set
  name = excluded.name,
  short_description = excluded.short_description,
  story_text = excluded.story_text,
  symbolism_text = excluded.symbolism_text;
