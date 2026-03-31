do $$
declare
  works_category_id uuid;
  good_shepherd_product_id uuid;
  good_shepherd_material_id uuid;
  lamb_product_id uuid;
  lamb_variant_id uuid;
  spring_product_id uuid;
  spring_variant_id uuid;
begin
  select id
  into works_category_id
  from public.catalogue_categories
  where slug = 'works'
  limit 1;

  if works_category_id is null then
    raise exception 'Missing catalogue category slug=works';
  end if;

  select pv.material_id
  into good_shepherd_material_id
  from public.products p
  join public.product_variants pv on pv.product_id = p.id
  where p.slug = 'painting-good-shepherd'
  order by pv.sort_order asc
  limit 1;

  if good_shepherd_material_id is null then
    raise exception 'Missing painting-good-shepherd material_id';
  end if;

  select id
  into lamb_product_id
  from public.products
  where slug = 'painting-lamb-with-ornaments'
  limit 1;

  if lamb_product_id is null then
    insert into public.products (
      slug,
      product_type,
      is_active,
      sort_order,
      category_id
    )
    values (
      'painting-lamb-with-ornaments',
      'painting',
      true,
      30,
      works_category_id
    )
    returning id into lamb_product_id;
  else
    update public.products
    set
      product_type = 'painting',
      is_active = true,
      sort_order = 30,
      category_id = works_category_id
    where id = lamb_product_id;
  end if;

  delete from public.product_translations
  where product_id = lamb_product_id;

  insert into public.product_translations (
    product_id,
    lang,
    title,
    subtitle,
    description,
    material_description
  )
  values
    (
      lamb_product_id,
      'ka',
      'კრავი',
      'ორიგინალი ნამუშევარი, 13.5×14.5 სმ',
      'ორიგინალი ნამუშევარი. ზომა: 13.5 × 14.5 სმ. მასალები: ქაღალდი, აკრილი, ფურცლოვანი ოქრო, მოვერცხლილი სპილენძი - ტონირებული.',
      'ფურცელი, ფურცლოვანი ოქრო, ლევკასი, ზეთის საღებავები'
    ),
    (
      lamb_product_id,
      'en',
      'Lamb',
      'Original painting, 13.5×14.5 cm',
      'Original painting. Size: 13.5 × 14.5 cm. Materials: paper, acrylic, gold leaf, silver-plated copper - toned.',
      'Paper, gold leaf, gesso, oil paints'
    ),
    (
      lamb_product_id,
      'ru',
      'Агнец',
      'Оригинальная работа, 13.5×14.5 см',
      'Оригинальная работа. Размер: 13.5 × 14.5 см. Материалы: бумага, акрил, сусальное золото, посеребренная медь - тонированная.',
      'Бумага, сусальное золото, левкас, масляные краски'
    );

  delete from public.product_images
  where product_id = lamb_product_id;

  delete from public.product_variants
  where product_id = lamb_product_id;

  insert into public.product_variants (
    product_id,
    sku,
    variant_name,
    size_label,
    material,
    material_id,
    price,
    stock_status,
    is_default,
    sort_order,
    width_cm,
    height_cm
  )
  values (
    lamb_product_id,
    'PAINTING-LAMB-WITH-ORNAMENTS-ORIGINAL',
    'Original',
    '13.5x14.5',
    null,
    good_shepherd_material_id,
    600,
    'in_stock',
    true,
    10,
    13.5,
    14.5
  )
  returning id into lamb_variant_id;

  insert into public.product_images (
    product_id,
    variant_id,
    storage_path,
    image_type,
    sort_order
  )
  values (
    lamb_product_id,
    lamb_variant_id,
    'painting-lamb-with-ornaments-front.jpg',
    'main',
    10
  );

  select id
  into spring_product_id
  from public.products
  where slug = 'painting-family'
  limit 1;

  if spring_product_id is null then
    insert into public.products (
      slug,
      product_type,
      is_active,
      sort_order,
      category_id
    )
    values (
      'painting-family',
      'painting',
      true,
      40,
      works_category_id
    )
    returning id into spring_product_id;
  else
    update public.products
    set
      product_type = 'painting',
      is_active = true,
      sort_order = 40,
      category_id = works_category_id
    where id = spring_product_id;
  end if;

  delete from public.product_translations
  where product_id = spring_product_id;

  insert into public.product_translations (
    product_id,
    lang,
    title,
    subtitle,
    description,
    material_description
  )
  values
    (
      spring_product_id,
      'ka',
      'გაზაფხული',
      'ორიგინალი ნამუშევარი, 13.5×14.5 სმ',
      'ორიგინალი ნამუშევარი. ზომა: 13.5 × 14.5 სმ. მასალები: ქაღალდი, აკრილი, ფურცლოვანი ოქრო, მოვერცხლილი სპილენძი - ტონირებული.',
      'ფურცელი, ფურცლოვანი ოქრო, ლევკასი, ზეთის საღებავები'
    ),
    (
      spring_product_id,
      'en',
      'Spring',
      'Original painting, 13.5×14.5 cm',
      'Original painting. Size: 13.5 × 14.5 cm. Materials: paper, acrylic, gold leaf, silver-plated copper - toned.',
      'Paper, gold leaf, gesso, oil paints'
    ),
    (
      spring_product_id,
      'ru',
      'Весна',
      'Оригинальная работа, 13.5×14.5 см',
      'Оригинальная работа. Размер: 13.5 × 14.5 см. Материалы: бумага, акрил, сусальное золото, посеребренная медь - тонированная.',
      'Бумага, сусальное золото, левкас, масляные краски'
    );

  delete from public.product_images
  where product_id = spring_product_id;

  delete from public.product_variants
  where product_id = spring_product_id;

  insert into public.product_variants (
    product_id,
    sku,
    variant_name,
    size_label,
    material,
    material_id,
    price,
    stock_status,
    is_default,
    sort_order,
    width_cm,
    height_cm
  )
  values (
    spring_product_id,
    'PAINTING-FAMILY-ORIGINAL',
    'Original',
    '13.5x14.5',
    null,
    good_shepherd_material_id,
    700,
    'in_stock',
    true,
    10,
    13.5,
    14.5
  )
  returning id into spring_variant_id;

  insert into public.product_images (
    product_id,
    variant_id,
    storage_path,
    image_type,
    sort_order
  )
  values (
    spring_product_id,
    spring_variant_id,
    'painting-family-front.jpg',
    'main',
    10
  );

  select id
  into good_shepherd_product_id
  from public.products
  where slug = 'painting-good-shepherd'
  limit 1;

  if good_shepherd_product_id is not null then
    update public.product_variants
    set price = 600
    where product_id = good_shepherd_product_id;
  end if;
end
$$;
