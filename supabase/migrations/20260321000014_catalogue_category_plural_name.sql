alter table public.catalogue_category_translations
  add column if not exists plural_name text;

comment on column public.catalogue_category_translations.plural_name is
  'Repo-added nullable plural display label for category-list surfaces such as catalogue filters and homepage category chips.';
