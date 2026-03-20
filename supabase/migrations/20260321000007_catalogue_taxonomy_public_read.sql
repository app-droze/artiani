alter table public.catalogue_categories enable row level security;

alter table public.catalogue_category_translations enable row level security;

alter table public.catalogue_collections enable row level security;

alter table public.catalogue_collection_translations enable row level security;

drop policy if exists "public can read active catalogue categories"
on public.catalogue_categories;

create policy "public can read active catalogue categories"
on public.catalogue_categories
for select
to anon
using (is_active = true);

drop policy if exists "public can read active catalogue category translations"
on public.catalogue_category_translations;

create policy "public can read active catalogue category translations"
on public.catalogue_category_translations
for select
to anon
using (
  exists (
    select 1
    from public.catalogue_categories
    where public.catalogue_categories.id = public.catalogue_category_translations.category_id
      and public.catalogue_categories.is_active = true
  )
);

drop policy if exists "public can read active catalogue collections"
on public.catalogue_collections;

create policy "public can read active catalogue collections"
on public.catalogue_collections
for select
to anon
using (is_active = true);

drop policy if exists "public can read active catalogue collection translations"
on public.catalogue_collection_translations;

create policy "public can read active catalogue collection translations"
on public.catalogue_collection_translations
for select
to anon
using (
  exists (
    select 1
    from public.catalogue_collections
    where public.catalogue_collections.id = public.catalogue_collection_translations.collection_id
      and public.catalogue_collections.is_active = true
  )
);
