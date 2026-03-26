create table if not exists public.catalogue_themes (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogue_themes_slug_key unique (slug)
);

create table if not exists public.catalogue_theme_translations (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references public.catalogue_themes(id) on delete cascade,
  lang public.lang_code not null,
  name text not null,
  short_description text,
  story_text text,
  symbolism_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogue_theme_translations_theme_lang_key unique (theme_id, lang)
);

create table if not exists public.product_themes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  theme_id uuid not null references public.catalogue_themes(id) on delete cascade,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint product_themes_product_theme_key unique (product_id, theme_id)
);

create index if not exists catalogue_themes_is_active_sort_order_idx
on public.catalogue_themes (is_active, sort_order);

create index if not exists catalogue_theme_translations_lang_idx
on public.catalogue_theme_translations (lang);

create index if not exists product_themes_product_primary_sort_order_idx
on public.product_themes (product_id, is_primary, sort_order);

create index if not exists product_themes_theme_id_idx
on public.product_themes (theme_id);

comment on table public.catalogue_themes is
  'Repo-added shared theme taxonomy table introduced on 2026-03-26 for reusable Artiani subject/theme records.';

comment on table public.catalogue_theme_translations is
  'Repo-added localized labels and shared narrative content for reusable Artiani themes.';

comment on table public.product_themes is
  'Repo-added many-to-many link table between products and shared Artiani themes.';

comment on column public.catalogue_theme_translations.short_description is
  'Optional concise shared PDP theme description.';

comment on column public.catalogue_theme_translations.story_text is
  'Optional shared narrative/story paragraph for a theme.';

comment on column public.catalogue_theme_translations.symbolism_text is
  'Optional shared symbolism/meaning paragraph for a theme.';

comment on column public.product_themes.is_primary is
  'Marks the primary theme for a product when multiple themes are linked.';
