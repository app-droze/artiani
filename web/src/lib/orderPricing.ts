import "server-only";

import type { Locale } from "@/src/i18n/locales";
import { isSoldPaintingVariant, type CatalogueProductType } from "@/src/lib/catalogueModels";
import { supabaseEnvDiagnostics } from "@/src/lib/env.server";
import { getPhoneCaseModelMap } from "@/src/lib/phoneCaseModels";
import {
  filterProductLevelImages,
  filterVariantProductImages,
  pickResolvedProductImage,
} from "@/src/lib/productImages";
import { getSupabasePublicReadClient } from "@/src/lib/supabasePublic";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";

const STORAGE_BUCKET = "products";
const PILLOW_BOTH_SIDES_SURCHARGE_CENTS = 1000;
const AUCTION_ONLY_STATUSES = ["scheduled", "live", "winner_pending_payment"] as const;

type OrderItemInput = {
  product_id: string;
  product_slug: string;
  variant_id: string;
  qty: number;
  material_label?: string | null;
  phone_model_code?: string | null;
  print_side?: "one_sided" | "both_sided" | null;
  print_side_label?: string | null;
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
  stock_status: string | null;
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
    material_label: string | null;
    phone_model_code: string | null;
    phone_model_label: string | null;
    size_label: string | null;
    print_side: "one_sided" | "both_sided" | null;
    print_side_label: string | null;
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

const readSupabaseErrorDetails = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return {
      code: null,
      message: "Unknown Supabase error",
      details: null,
      hint: null,
    };
  }

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };

  return {
    code: typeof candidate.code === "string" ? candidate.code : null,
    message:
      typeof candidate.message === "string" && candidate.message.trim().length > 0
        ? candidate.message
        : "Unknown Supabase error",
    details: typeof candidate.details === "string" ? candidate.details : null,
    hint: typeof candidate.hint === "string" ? candidate.hint : null,
  };
};

const pickImageUrl = (images: ProductImageRow[], variantId: string) => {
  const selected = pickResolvedProductImage({
    variantImages: filterVariantProductImages(images, variantId),
    productImages: filterProductLevelImages(images),
  });

  return selected ? toPublicImageUrl(selected.storage_path) : "";
};

const fetchProducts = async (productIds: string[]): Promise<ProductRow[]> => {
  console.info("[orderPricing] fetching products", {
    productCount: productIds.length,
    clientPath: "admin",
    adminKeyEnv: supabaseEnvDiagnostics.chosenAdminKeyEnv,
  });
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, product_type, product_translations(lang, title), product_variants(id, variant_name, background_name, ornament_name, size_label, price, stock_status), product_images(variant_id, image_type, storage_path, sort_order)",
    )
    .in("id", productIds)
    .eq("is_active", true);

  if (error) {
    const details = readSupabaseErrorDetails(error);
    console.error("[orderPricing] product fetch failed", {
      ...details,
      productCount: productIds.length,
      clientPath: "admin",
      adminKeyEnv: supabaseEnvDiagnostics.chosenAdminKeyEnv,
    });
    throw new Error(`[orderPricing] Failed to fetch products: ${error.message}`);
  }

  return (data ?? []) as ProductRow[];
};

const fetchAuctionOnlyProductIds = async (productIds: string[]) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("auction_events")
    .select("product_id")
    .in("product_id", productIds)
    .in("status", [...AUCTION_ONLY_STATUSES]);

  if (error) {
    const details = readSupabaseErrorDetails(error);
    console.error("[orderPricing] auction fetch failed", {
      ...details,
      productCount: productIds.length,
      clientPath: "admin",
      adminKeyEnv: supabaseEnvDiagnostics.chosenAdminKeyEnv,
    });
    throw new Error(`[orderPricing] Failed to fetch auction products: ${error.message}`);
  }

  return new Set((data ?? []).map((row) => row.product_id));
};

export const priceCart = async (items: OrderItemInput[]): Promise<PriceCartResult> => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("priceCart expected a non-empty array of items.");
  }

  const productIds = [...new Set(items.map((item) => item.product_id))];
  const [products, auctionOnlyProductIds] = await Promise.all([
    fetchProducts(productIds),
    fetchAuctionOnlyProductIds(productIds),
  ]);
  const phoneCaseModelMap = await getPhoneCaseModelMap();
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
    if (auctionOnlyProductIds.has(product.id)) {
      throw new Error(`priceCart item at index ${index} references an auction-only product.`);
    }

    const variant = product.product_variants.find((entry) => entry.id === item.variant_id);
    if (!variant || typeof variant.price !== "number") {
      throw new Error(`priceCart item at index ${index} has unknown variant reference.`);
    }
    if (
      isSoldPaintingVariant({
        productType: product.product_type,
        stockStatus: variant.stock_status,
      })
    ) {
      throw new Error(`priceCart item at index ${index} references a sold painting.`);
    }

    const pillowPrintSideSurchargeCents =
      product.product_type === "pillow" && item.print_side === "both_sided"
        ? PILLOW_BOTH_SIDES_SURCHARGE_CENTS
        : 0;
    const unitPriceCents = Math.round(variant.price * 100) + pillowPrintSideSurchargeCents;
    const titleEn = pickTranslationTitle(product.product_translations ?? [], "en", product.slug);
    const titleKa = pickTranslationTitle(product.product_translations ?? [], "ka", titleEn);
    const phoneModel =
      product.product_type === "phone_case"
        ? phoneCaseModelMap.get(item.phone_model_code ?? "")
        : null;

    if (product.product_type === "phone_case" && !phoneModel) {
      throw new Error(`priceCart item at index ${index} has unknown phone model.`);
    }

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
        material_label: item.material_label ?? null,
        phone_model_code: phoneModel?.code ?? null,
        phone_model_label: phoneModel?.label ?? null,
        size_label: variant.size_label,
        print_side: item.print_side ?? null,
        print_side_label: item.print_side_label ?? null,
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
