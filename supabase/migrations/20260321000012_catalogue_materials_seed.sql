insert into public.catalogue_materials (
  code,
  sort_order,
  is_active
)
values
  ('canvas', 10, true),
  ('velvet', 20, true),
  ('artificial_silk', 30, true)
on conflict (code) do update
set
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

with material_seed as (
  select id, code
  from public.catalogue_materials
  where code in ('canvas', 'velvet', 'artificial_silk')
)
insert into public.catalogue_material_translations (
  material_id,
  lang,
  name
)
values
  ((select id from material_seed where code = 'canvas'), 'ka', 'ტილო'),
  ((select id from material_seed where code = 'canvas'), 'en', 'Canvas'),
  ((select id from material_seed where code = 'canvas'), 'ru', 'Холст'),

  ((select id from material_seed where code = 'velvet'), 'ka', 'ხავერდი'),
  ((select id from material_seed where code = 'velvet'), 'en', 'Velvet'),
  ((select id from material_seed where code = 'velvet'), 'ru', 'Бархат'),

  ((select id from material_seed where code = 'artificial_silk'), 'ka', 'ხელოვნური აბრეშუმი'),
  ((select id from material_seed where code = 'artificial_silk'), 'en', 'Artificial silk'),
  ((select id from material_seed where code = 'artificial_silk'), 'ru', 'Искусственный шелк')
on conflict (material_id, lang) do update
set
  name = excluded.name;
