create table if not exists public.catalogue_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogue_categories_slug_key unique (slug)
);

create table if not exists public.catalogue_category_translations (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.catalogue_categories(id),
  lang public.lang_code not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogue_category_translations_category_lang_key unique (category_id, lang)
);

create table if not exists public.catalogue_collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogue_collections_slug_key unique (slug)
);

create table if not exists public.catalogue_collection_translations (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.catalogue_collections(id),
  lang public.lang_code not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogue_collection_translations_collection_lang_key unique (collection_id, lang)
);

alter table public.products
  add column if not exists category_id uuid references public.catalogue_categories(id),
  add column if not exists subtype_code text,
  add column if not exists collection_id uuid references public.catalogue_collections(id);

create index if not exists products_category_id_idx
on public.products (category_id);

create index if not exists products_collection_id_idx
on public.products (collection_id);

comment on table public.catalogue_categories is
  'Repo-added catalogue taxonomy table introduced on 2026-03-21 for top-level sellable catalogue categories.';

comment on table public.catalogue_category_translations is
  'Repo-added localized labels and descriptions for top-level sellable catalogue categories.';

comment on table public.catalogue_collections is
  'Repo-added catalogue design-family table introduced on 2026-03-21.';

comment on table public.catalogue_collection_translations is
  'Repo-added localized labels and descriptions for catalogue design families.';

comment on column public.products.category_id is
  'Repo-added nullable category reference. products.product_type remains in place for backward compatibility until app migration.';

comment on column public.products.subtype_code is
  'Repo-added nullable subtype/form code, e.g. round or rectangular under a shared top-level category.';

comment on column public.products.collection_id is
  'Repo-added nullable design-family reference, e.g. kajar or lambs.';
