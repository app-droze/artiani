# Schema Contract

This file documents the current live Supabase contract reconstructed on 2026-03-20 from:

- current app code in [`web/`](/Users/giorgimargiani/Projects/artiani/web)
- live Supabase table samples queried through the configured service-role project
- live Supabase Data API OpenAPI metadata queried with the configured secret key
- existing repo SQL in [`supabase/artist_media_cards.sql`](/Users/giorgimargiani/Projects/artiani/supabase/artist_media_cards.sql)

It is conservative by design. Anything not directly confirmed is marked uncertain.

## Required Tables

The app currently depends on these public-schema tables:

- `products`
- `product_translations`
- `product_variants`
- `product_images`
- `orders`
- `order_items`
- `artist_media_cards`

## Required Columns By Code

### `products`

Required by code:

- `id`
- `slug`
- `product_type`
- `is_active`
- `sort_order`

Present live but not currently used by app code:

- `is_featured`
- `created_at`
- `updated_at`

Notes:

- App behavior assumes `slug` can be used as a stable product URL key.
- Live uniqueness of `slug` was not directly confirmed from available metadata.

### `product_translations`

Required by code:

- `product_id`
- `lang`
- `title`
- `subtitle`
- `description`
- `material_description`
- `care_info`

Present live but not currently used by app code:

- `id`
- `created_at`
- `updated_at`

Notes:

- App behavior assumes at most one translation row per `(product_id, lang)`.
- Live uniqueness on `(product_id, lang)` was not directly confirmed from available metadata.

### `product_variants`

Required by code:

- `id`
- `product_id`
- `variant_name`
- `background_name`
- `ornament_name`
- `size_label`
- `material`
- `price`
- `stock_status`
- `is_default`
- `sort_order`
- `width_cm`
- `height_cm`
- `print_width_cm`
- `print_height_cm`

Present live but not currently used by app code:

- `sku`
- `created_at`
- `updated_at`

Notes:

- App code reads `width_cm`, `height_cm`, `print_width_cm`, and `print_height_cm` in print-area logic.
- App behavior assumes one product variant may be the default, but that is not enforced in app code.
- Live uniqueness of `sku` was not directly confirmed from available metadata.

### `product_images`

Required by code:

- `id`
- `variant_id`
- `image_type`
- `storage_path`
- `sort_order`

Present live but not currently used directly by app code:

- `product_id`
- `created_at`

Notes:

- Live enum values confirmed for `image_type`: `main`, `detail`, `lifestyle`, `flat`.
- Current live rows sampled only used `main` and `flat`.
- App image ordering depends on `image_type` priority, then `sort_order`.

### `orders`

Required by code:

- `id`
- `order_code`
- `customer_name`
- `email`
- `phone`
- `address`
- `note`
- `status`
- `total_amount`
- `currency`
- `lang`
- `created_at`

Present live but not currently used directly by app code:

- `updated_at`

Notes:

- App currently writes `status = 'awaiting_payment'` on creation.
- App-supported status values in UI/code are: `pending`, `paid`, `processing`, `shipped`, `completed`, `cancelled`, `awaiting_payment`.
- Live enum values confirmed for `status` match those app-supported values.
- App behavior assumes `order_code` is unique for safe lookup/retry, but the exact live unique constraint was not directly confirmed.
- Current live rows included both short `ART-XXXXXX` codes and older long `ART-YYYYMMDD-XXXXXX` codes.

### `order_items`

Required by code:

- `order_id`
- `product_id`
- `variant_id`
- `qty`
- `unit_price`
- `line_total`
- `snapshot_title`
- `snapshot_variant`

Present live but not currently used directly by app code:

- `id`
- `created_at`

Notes:

- App uses `snapshot_title` and `snapshot_variant` as fallbacks during order lookup.

### `artist_media_cards`

Required by code:

- `id`
- `title`
- `type`
- `url`
- `thumbnail_path`
- `excerpt`
- `published_at`
- `lang`
- `sort_order`
- `external_source`
- `open_mode`
- `is_published`

Present live but not currently used directly by app code:

- `created_at`
- `updated_at`

Notes:

- Homepage UI currently ignores `open_mode` and always opens cards in a new tab.
- Existing repo SQL confirmed checks and the public read policy for published rows.

## Public Readability / RLS Findings

Confirmed with the current publishable key:

- Publicly readable: `products`, `product_translations`, `product_variants`, `product_images`, `artist_media_cards`
- Not publicly readable: `orders`, `order_items`

Fully confirmed policy objects:

- `artist_media_cards`: policy `"public can read published media cards"` from existing repo SQL

Uncertain:

- Exact live RLS/grant mechanism for catalogue tables (`products`, `product_translations`, `product_variants`, `product_images`)
- Exact live RLS/grant mechanism for write/read restrictions on `orders` and `order_items`

Those objects were not visible through the available metadata endpoints.

## Confirmed DB Objects

Confirmed exactly from available SQL / live metadata:

- primary keys on all 7 active tables
- foreign keys:
  - `product_translations.product_id -> products.id`
  - `product_variants.product_id -> products.id`
  - `product_images.product_id -> products.id`
  - `product_images.variant_id -> product_variants.id`
  - `order_items.order_id -> orders.id`
  - `order_items.product_id -> products.id`
  - `order_items.variant_id -> product_variants.id`
- `artist_media_cards` check constraints:
  - `artist_media_cards_type_check`
  - `artist_media_cards_lang_check`
  - `artist_media_cards_open_mode_check`
- `artist_media_cards` index:
  - `artist_media_cards_home_idx` on `(is_published, lang, sort_order, published_at desc)`
- `artist_media_cards` RLS enabled
- `artist_media_cards` policy:
  - `"public can read published media cards"` for `select` to `anon` using `(is_published = true)`

Not confirmed exactly:

- any non-PK unique constraint
- any non-`artist_media_cards` non-PK index
- any trigger or trigger-backed `updated_at` automation
- any exact RLS/grant SQL for catalogue tables, `orders`, or `order_items`

## Types Confirmed Live

Confirmed enum types from live OpenAPI metadata:

- `public.lang_code`: `ka`, `en`, `ru`
- `public.order_status`: `pending`, `paid`, `processing`, `shipped`, `completed`, `cancelled`, `awaiting_payment`
- `public.stock_status`: `in_stock`, `preorder`, `out_of_stock`
- `public.image_type`: `main`, `detail`, `lifestyle`, `flat`
- `public.product_type`: `tablecloth_square`, `tablecloth_round`, `pillow`, `table_runner`, `scarf`, `notebook`, `tshirt`, `phone_case`, `handbag`

## Uncertainties

Not fully reconstructable from available live metadata / SQL evidence:

- non-PK unique constraints
- non-`artist_media_cards` non-PK indexes
- triggers/functions, including any automatic `updated_at` maintenance
- exact catalogue-table RLS policies or grants
- exact orders/order_items RLS policies or grants
- any additional live DB objects outside the exposed Data API surface

These were intentionally not guessed in migrations.

## Live Objects Not Used By Current App

Confirmed live but not currently used by app code:

- `products.is_featured`
- `product_variants.sku`
- `product_type` enum members: `notebook`, `tshirt`, `phone_case`, `handbag`
- `artist_media_cards.open_mode` is stored but not acted on by the homepage UI

## Repo Notes

Migration files added under [`supabase/migrations/`](/Users/giorgimargiani/Projects/artiani/supabase/migrations) recreate only the confirmed contract.

They do **not** drop or rename anything automatically.
