import "server-only";

import type { Locale } from "@/src/i18n/locales";
import {
  PRODUCT_TYPES,
  type CatalogueProduct,
  type CatalogueProductType,
} from "@/src/lib/catalogueModels";
import {
  pickMainProductImage,
  pickPrimaryProductImage,
  sortProductImages,
} from "@/src/lib/productImages";
import { getSupabasePublicReadClient } from "@/src/lib/supabasePublic";
const STORAGE_BUCKET = "products";

type ProductTranslationRow = {
  lang: string;
  title: string | null;
  subtitle?: string | null;
  description?: string | null;
  material_description: string | null;
  care_info?: string | null;
};

type ProductVariantRow = {
  id: string;
  variant_name: string | null;
  background_name: string | null;
  ornament_name: string | null;
  size_label: string | null;
  width_cm?: number | null;
  height_cm?: number | null;
  print_width_cm?: number | null;
  print_height_cm?: number | null;
  material: string | null;
  price: number | null;
  stock_status: string | null;
  is_default: boolean | null;
  sort_order: number | null;
};

type ProductImageRow = {
  id: string;
  variant_id: string | null;
  image_type: string | null;
  storage_path: string;
  sort_order: number | null;
};

type ProductRow = {
  id: string;
  slug: string;
  product_type: CatalogueProductType;
  is_active: boolean;
  sort_order: number | null;
  product_translations: ProductTranslationRow[];
  product_variants: ProductVariantRow[];
  product_images: ProductImageRow[];
};

const resolveLocaleOrder = (lang: Locale) => {
  const fallbackOrder: Locale[] = ["en", "ka"];
  return [lang, ...fallbackOrder.filter((locale) => locale !== lang)];
};

const sortByOrder = <T extends { sort_order?: number | null }>(items: T[]) =>
  [...items].sort((left, right) => (left.sort_order ?? 9999) - (right.sort_order ?? 9999));

const getTranslation = (
  translations: ProductTranslationRow[],
  lang: Locale,
) => {
  const order = resolveLocaleOrder(lang);

  for (const locale of order) {
    const match = translations.find((translation) => translation.lang === locale);
    if (match) {
      return match;
    }
  }

  return translations[0] ?? null;
};

const toPublicImageUrl = (storagePath: string) =>
  getSupabasePublicReadClient().storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;

const mapVariantImages = (images: ProductImageRow[]) =>
  sortProductImages(images).map((image) => ({
    id: image.id,
    url: toPublicImageUrl(image.storage_path),
    imageType: image.image_type,
    sortOrder: image.sort_order ?? 9999,
  }));

const unique = <T,>(items: T[]) => [...new Set(items)];
const buildVariantStyleKey = (variant: ProductVariantRow) =>
  [variant.variant_name, variant.background_name, variant.ornament_name]
    .filter(Boolean)
    .join("|");

const mapProduct = (row: ProductRow, lang: Locale): CatalogueProduct => {
  const translations = row.product_translations ?? [];
  const translation = getTranslation(translations, lang);
  const allImages = mapVariantImages(row.product_images ?? []);

  const sortedVariantRows = sortByOrder(row.product_variants ?? []);
  const colorCount = unique(sortedVariantRows.map((variant) => buildVariantStyleKey(variant))).length;

  const variants = sortedVariantRows.map((variant) => {
    const variantImages = allImages.filter((image) =>
      row.product_images.some(
        (productImage) => productImage.id === image.id && productImage.variant_id === variant.id,
      ),
    );

    return {
      id: variant.id,
      name: variant.variant_name ?? variant.background_name ?? variant.ornament_name ?? variant.id,
      backgroundName: variant.background_name,
      ornamentName: variant.ornament_name,
      sizeLabel: variant.size_label,
      widthCm: variant.width_cm ?? null,
      heightCm: variant.height_cm ?? null,
      printWidthCm: variant.print_width_cm ?? null,
      printHeightCm: variant.print_height_cm ?? null,
      material: variant.material,
      price: variant.price ?? 0,
      stockStatus: variant.stock_status,
      isDefault: variant.is_default === true,
      sortOrder: variant.sort_order ?? 9999,
      images: variantImages,
    };
  });

  const defaultVariant =
    variants.find((variant) => variant.isDefault) ??
    variants[0] ??
    null;

  const defaultPrice =
    variants.find((variant) => variant.isDefault)?.price ??
    [...variants].sort((left, right) => left.price - right.price)[0]?.price ??
    0;

  const heroMainImage = defaultVariant
    ? pickMainProductImage(defaultVariant.images)?.url ??
      pickMainProductImage(allImages)?.url ??
      pickPrimaryProductImage(defaultVariant.images)?.url ??
      pickPrimaryProductImage(allImages)?.url ??
      null
    : pickMainProductImage(allImages)?.url ??
      pickPrimaryProductImage(allImages)?.url ??
      null;

  const cardImage = defaultVariant
    ? pickMainProductImage(defaultVariant.images)?.url ??
      pickMainProductImage(allImages)?.url ??
      null
    : pickMainProductImage(allImages)?.url ?? null;

  const gallery = defaultVariant
    ? unique(defaultVariant.images.map((image) => image.url))
    : unique(allImages.map((image) => image.url));

  return {
    id: row.id,
    slug: row.slug,
    productType: row.product_type,
    title: translation?.title ?? row.slug,
    subtitle: translation?.subtitle ?? null,
    description: translation?.description ?? null,
    materialDescription: translation?.material_description ?? null,
    careInfo: translation?.care_info ?? null,
    defaultPrice,
    variantCount: colorCount,
    cardImage,
    mainImage: heroMainImage,
    gallery,
    defaultVariant,
    variants,
    sizes: unique(
      variants.map((variant) => variant.sizeLabel).filter((sizeLabel): sizeLabel is string => Boolean(sizeLabel)),
    ),
  };
};

const fetchProductRows = async (): Promise<ProductRow[]> => {
  const supabase = getSupabasePublicReadClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, product_type, is_active, sort_order, product_translations(lang, title, subtitle, description, material_description, care_info), product_variants(*), product_images(id, variant_id, image_type, storage_path, sort_order)",
    )
    .in("product_type", [...PRODUCT_TYPES])
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`[catalogueQueries] Failed to fetch products: ${error.message}`);
  }

  return (data ?? []) as ProductRow[];
};

export const getCatalogueProducts = async (
  lang: Locale,
  productType?: CatalogueProductType,
) => {
  const rows = await fetchProductRows();

  return rows
    .filter((row) => !productType || row.product_type === productType)
    .map((row) => mapProduct(row, lang));
};

export const getProductBySlug = async (slug: string, lang: Locale) => {
  const rows = await fetchProductRows();
  const row = rows.find((product) => product.slug === slug);

  return row ? mapProduct(row, lang) : null;
};
