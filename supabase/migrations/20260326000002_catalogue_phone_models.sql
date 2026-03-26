create table if not exists public.catalogue_phone_models (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  brand text not null,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogue_phone_models_code_key unique (code)
);

comment on table public.catalogue_phone_models is
  'Repo-added shared phone case model table introduced on 2026-03-26 for configurable phone case sizing options.';
