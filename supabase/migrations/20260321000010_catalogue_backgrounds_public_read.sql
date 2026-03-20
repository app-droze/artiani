alter table public.catalogue_backgrounds enable row level security;

drop policy if exists "public can read active catalogue backgrounds"
on public.catalogue_backgrounds;

create policy "public can read active catalogue backgrounds"
on public.catalogue_backgrounds
for select
to anon
using (is_active = true);
