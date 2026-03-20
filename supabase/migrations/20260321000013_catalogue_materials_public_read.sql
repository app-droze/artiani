alter table public.catalogue_materials enable row level security;

alter table public.catalogue_material_translations enable row level security;

drop policy if exists "public can read active catalogue materials"
on public.catalogue_materials;

create policy "public can read active catalogue materials"
on public.catalogue_materials
for select
to anon
using (is_active = true);

drop policy if exists "public can read active catalogue material translations"
on public.catalogue_material_translations;

create policy "public can read active catalogue material translations"
on public.catalogue_material_translations
for select
to anon
using (
  exists (
    select 1
    from public.catalogue_materials
    where public.catalogue_materials.id = public.catalogue_material_translations.material_id
      and public.catalogue_materials.is_active = true
  )
);
