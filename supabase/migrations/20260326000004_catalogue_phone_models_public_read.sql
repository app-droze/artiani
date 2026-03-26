alter table public.catalogue_phone_models enable row level security;

drop policy if exists "public can read active catalogue phone models"
on public.catalogue_phone_models;

create policy "public can read active catalogue phone models"
on public.catalogue_phone_models
for select
to anon
using (is_active = true);
