alter table public.auction_bids enable row level security;

alter table public.auction_events enable row level security;

alter table public.catalogue_themes enable row level security;

alter table public.catalogue_theme_translations enable row level security;

alter table public.product_themes enable row level security;

drop policy if exists "public can read visible auction events"
on public.auction_events;

create policy "public can read visible auction events"
on public.auction_events
for select
to anon
using (
  status in ('scheduled', 'live', 'winner_pending_payment')
);

drop policy if exists "public can read active catalogue themes"
on public.catalogue_themes;

create policy "public can read active catalogue themes"
on public.catalogue_themes
for select
to anon
using (is_active = true);

drop policy if exists "public can read active catalogue theme translations"
on public.catalogue_theme_translations;

create policy "public can read active catalogue theme translations"
on public.catalogue_theme_translations
for select
to anon
using (
  exists (
    select 1
    from public.catalogue_themes
    where public.catalogue_themes.id = public.catalogue_theme_translations.theme_id
      and public.catalogue_themes.is_active = true
  )
);

drop policy if exists "public can read active product theme links"
on public.product_themes;

create policy "public can read active product theme links"
on public.product_themes
for select
to anon
using (
  exists (
    select 1
    from public.catalogue_themes
    join public.products
      on public.products.id = public.product_themes.product_id
    where public.catalogue_themes.id = public.product_themes.theme_id
      and public.catalogue_themes.is_active = true
      and public.products.is_active = true
  )
);
