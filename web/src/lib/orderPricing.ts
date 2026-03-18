import "server-only";

import type { Locale } from "@/src/i18n/locales";
import type { CatalogueProductType } from "@/src/lib/catalogueModels";
import { pickPrimaryProductImage } from "@/src/lib/productImages";
import { getSupabasePublicReadClient } from "@/src/lib/supabasePublic";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";

const STORAGE_BUCKET = "products";

type OrderItemInput = {
  product_id: string;
  product_slug: string;
  variant_id: string;
  qty: number;
};

type ProductTranslationRow = {
  lang: string;
  title: string | null;
};

type ProductVariantRow = {
  id: string;
  variant_name: string | null;
  background_name: string | null;
  ornament_name: string | null;
  size_label: string | null;
  price: number | null;
};

type ProductImageRow = {
  variant_id: string | null;
  image_type: string | null;
  storage_path: string;
  sort_order: number | null;
};

type ProductRow = {
  id: string;
  slug: string;
  product_type: CatalogueProductType;
  product_translations: ProductTranslationRow[];
  product_variants: ProductVariantRow[];
  product_images: ProductImageRow[];
};

export type PricedLineItem = {
  product_id: string;
  product_slug: string;
  title_en: string;
  title_ka: string;
  product_kind: CatalogueProductType;
  image_url: string;
  qty: number;
  options: {
    variant_id: string;
    color_label: string | null;
    background_label: string | null;
    size_label: string | null;
  };
  unit_price_cents: number;
  line_total_cents: number;
};

export type PriceCartResult = {
  line_items: PricedLineItem[];
  subtotal_cents: number;
  total_cents: number;
};

const toPublicImageUrl = (storagePath: string) =>
  getSupabasePublicReadClient().storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;

const pickTranslationTitle = (translations: ProductTranslationRow[], lang: Locale, fallback: string) =>
  translations.find((entry) => entry.lang === lang)?.title?.trim() ||
  translations.find((entry) => entry.lang === "en")?.title?.trim() ||
  translations.find((entry) => entry.lang === "ka")?.title?.trim() ||
  translations.find((entry) => entry.title?.trim())?.title?.trim() ||
  fallback;

const buildColorLabel = (variant: ProductVariantRow) =>
  variant.background_name ?? variant.variant_name ?? variant.ornament_name ?? null;

const pickImageUrl = (images: ProductImageRow[], variantId: string) => {
  const variantImages = images.filter((image) => image.variant_id === variantId);
  const selected = pickPrimaryProductImage(variantImages.length > 0 ? variantImages : images);

  return selected ? toPublicImageUrl(selected.storage_path) : "";
};

const fetchProducts = async (productIds: string[]): Promise<ProductRow[]> => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, product_type, product_translations(lang, title), product_variants(id, variant_name, background_name, ornament_name, size_label, price), product_images(variant_id, image_type, storage_path, sort_order)",
    )
    .in("id", productIds)
    .eq("is_active", true);

  if (error) {
    throw new Error(`[orderPricing] Failed to fetch products: ${error.message}`);
  }

  return (data ?? []) as ProductRow[];
};

export const priceCart = async (items: OrderItemInput[]): Promise<PriceCartResult> => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("priceCart expected a non-empty array of items.");
  }

  const productIds = [...new Set(items.map((item) => item.product_id))];
  const products = await fetchProducts(productIds);
  const productById = new Map(products.map((product) => [product.id, product]));

  const lineItems = items.map((item, index) => {
    if (!item.product_id || !item.product_slug || !item.variant_id) {
      throw new Error(`priceCart item at index ${index} is missing identifiers.`);
    }

    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1) {
      throw new Error(`priceCart item at index ${index} has invalid qty.`);
    }

    const product = productById.get(item.product_id);
    if (!product || product.slug !== item.product_slug) {
      throw new Error(`priceCart item at index ${index} has unknown product reference.`);
    }

    const variant = product.product_variants.find((entry) => entry.id === item.variant_id);
    if (!variant || typeof variant.price !== "number") {
      throw new Error(`priceCart item at index ${index} has unknown variant reference.`);
    }

    const unitPriceCents = Math.round(variant.price * 100);
    const titleEn = pickTranslationTitle(product.product_translations ?? [], "en", product.slug);
    const titleKa = pickTranslationTitle(product.product_translations ?? [], "ka", titleEn);

    return {
      product_id: product.id,
      product_slug: product.slug,
      title_en: titleEn,
      title_ka: titleKa,
      product_kind: product.product_type,
      image_url: pickImageUrl(product.product_images ?? [], variant.id),
      qty,
      options: {
        variant_id: variant.id,
        color_label: buildColorLabel(variant),
        background_label: variant.background_name,
        size_label: variant.size_label,
      },
      unit_price_cents: unitPriceCents,
      line_total_cents: unitPriceCents * qty,
    };
  });

  const subtotalCents = lineItems.reduce((sum, item) => sum + item.line_total_cents, 0);

  return {
    line_items: lineItems,
    subtotal_cents: subtotalCents,
    total_cents: subtotalCents,
  };
};
