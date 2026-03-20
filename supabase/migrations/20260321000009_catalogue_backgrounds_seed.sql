insert into public.catalogue_backgrounds (
  code,
  name,
  display_type,
  hex_value,
  image_url,
  sort_order,
  is_active
)
values
  ('white', 'White', 'color', '#ffffff', null, 10, true),
  ('ornaments', 'Ornaments', 'image', null, 'https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/background-golden-ornaments.png', 20, true),
  ('golden', 'Golden', 'image', null, 'https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/background-golden.png', 30, true),
  ('sky', 'Sky', 'color', '#afc4cf', null, 40, true),
  ('lilac', 'Lilac', 'color', '#c8a2c8', null, 50, true),
  ('h_orange', 'H Orange', 'color', '#e67e22', null, 60, true),
  ('forest_green', 'Forest Green', 'color', '#214136', null, 70, true),
  ('navy', 'Navy', 'color', '#34405c', null, 80, true),
  ('antique_bordeaux', 'Antique Bordeaux', 'color', '#6a1f24', null, 90, true),
  ('purple', 'Purple', 'color', '#521a57', null, 100, true),
  ('antique_olive', 'Antique Olive', 'color', '#66663a', null, 110, true)
on conflict (code) do update
set
  name = excluded.name,
  display_type = excluded.display_type,
  hex_value = excluded.hex_value,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
