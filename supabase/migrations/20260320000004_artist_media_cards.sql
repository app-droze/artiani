create table if not exists public.artist_media_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null,
  url text not null,
  thumbnail_path text,
  excerpt text,
  published_at timestamptz,
  lang text,
  sort_order int not null default 100,
  external_source text,
  is_published boolean not null default true,
  open_mode text not null default 'external',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artist_media_cards_type_check
    check (type in ('youtube_video', 'facebook_post', 'exhibition', 'article', 'site_link')),
  constraint artist_media_cards_lang_check
    check (lang is null or lang in ('ka', 'en', 'ru')),
  constraint artist_media_cards_open_mode_check
    check (open_mode in ('external', 'modal'))
);

create index if not exists artist_media_cards_home_idx
on public.artist_media_cards (is_published, lang, sort_order, published_at desc);

alter table public.artist_media_cards enable row level security;

drop policy if exists "public can read published media cards" on public.artist_media_cards;

create policy "public can read published media cards"
on public.artist_media_cards
for select
to anon
using (is_published = true);
