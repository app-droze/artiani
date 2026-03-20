create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  product_type public.product_type not null,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_translations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  lang public.lang_code not null,
  title text not null,
  subtitle text,
  description text,
  material_description text,
  care_info text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  sku text not null,
  variant_name text not null,
  background_name text,
  ornament_name text,
  size_label text,
  material text,
  price numeric not null,
  stock_status public.stock_status not null default 'in_stock',
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  width_cm numeric,
  height_cm numeric,
  print_width_cm numeric,
  print_height_cm numeric
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  variant_id uuid references public.product_variants(id),
  storage_path text not null,
  image_type public.image_type not null default 'main',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.products is
  'Live contract reconstructed from current Supabase OpenAPI metadata on 2026-03-20.';

comment on table public.product_translations is
  'Live contract reconstructed from current Supabase OpenAPI metadata on 2026-03-20.';

comment on table public.product_variants is
  'Live contract reconstructed from current Supabase OpenAPI metadata on 2026-03-20.';

comment on table public.product_images is
  'Live contract reconstructed from current Supabase OpenAPI metadata on 2026-03-20.';

comment on column public.product_images.image_type is
  'App code currently uses main/detail/flat/lifestyle ordering. Live enum values confirmed via Data API metadata.';

comment on column public.product_variants.width_cm is
  'Used by app print-area logic.';

comment on column public.product_variants.height_cm is
  'Used by app print-area logic.';

comment on column public.product_variants.print_width_cm is
  'Used by app print-area logic.';

comment on column public.product_variants.print_height_cm is
  'Used by app print-area logic.';

-- No additional exact unique constraints, non-PK indexes, RLS policies, or triggers
-- were confirmed for these catalogue tables by the SQL evidence available during
-- schema reconstruction, so they are intentionally not recreated here.
