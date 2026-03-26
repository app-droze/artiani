insert into public.artist_media_cards (
  title,
  type,
  url,
  thumbnail_path,
  excerpt,
  published_at,
  lang,
  sort_order,
  external_source,
  is_published,
  open_mode
)
select
  'ლევან მარგიანი რწმენა და შთაგონება - იგავი ხე კეთილისა და ხე ბოროტის შესახებ',
  'article',
  'https://www.aversi.ge/ka/cnobari/3305/igavi-khe-ketilisa-da-khe-borotis-shesakheb-levan-margianis-rwmena-da-shtagoneba',
  null,
  null,
  null,
  'ka',
  55,
  'aversi.ge',
  true,
  'external'
where not exists (
  select 1
  from public.artist_media_cards
  where url = 'https://www.aversi.ge/ka/cnobari/3305/igavi-khe-ketilisa-da-khe-borotis-shesakheb-levan-margianis-rwmena-da-shtagoneba'
);
