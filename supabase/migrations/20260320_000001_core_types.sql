create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'lang_code'
  ) then
    create type public.lang_code as enum ('ka', 'en', 'ru');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'order_status'
  ) then
    create type public.order_status as enum (
      'pending',
      'paid',
      'processing',
      'shipped',
      'completed',
      'cancelled',
      'awaiting_payment'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'stock_status'
  ) then
    create type public.stock_status as enum (
      'in_stock',
      'preorder',
      'out_of_stock'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'image_type'
  ) then
    create type public.image_type as enum (
      'main',
      'detail',
      'lifestyle',
      'flat'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'product_type'
  ) then
    create type public.product_type as enum (
      'tablecloth_square',
      'tablecloth_round',
      'pillow',
      'table_runner',
      'scarf',
      'notebook',
      'tshirt',
      'phone_case',
      'handbag'
    );
  end if;
end
$$;
