create table if not exists public.catalogue_materials (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogue_materials_code_key unique (code)
);

create table if not exists public.catalogue_material_translations (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.catalogue_materials(id),
  lang public.lang_code not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogue_material_translations_material_lang_key unique (material_id, lang)
);

alter table public.product_variants
  add column if not exists material_id uuid references public.catalogue_materials(id);

comment on table public.catalogue_materials is
  'Repo-added shared material table introduced on 2026-03-21 for canonical variant materials.';

comment on table public.catalogue_material_translations is
  'Repo-added localized material names for canonical variant materials.';

comment on column public.product_variants.material_id is
  'Repo-added nullable canonical material reference. product_variants.material remains in place for backward compatibility.';
