create table if not exists public.catalogue_backgrounds (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  display_type text not null,
  hex_value text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogue_backgrounds_code_key unique (code),
  constraint catalogue_backgrounds_display_type_check
    check (display_type in ('color', 'image'))
);

alter table public.product_variants
  add column if not exists background_id uuid references public.catalogue_backgrounds(id);

comment on table public.catalogue_backgrounds is
  'Repo-added shared background table introduced on 2026-03-21 for canonical variant background swatches.';

comment on column public.product_variants.background_id is
  'Repo-added nullable canonical background reference. product_variants.background_name remains in place for backward compatibility.';
