import "server-only";

import type { Locale } from "@/src/i18n/locales";
import { getSupabasePublicReadClient } from "@/src/lib/supabasePublic";

const PRODUCT_TYPES = ["tablecloth_round", "tablecloth_square"] as const;
const STORAGE_BUCKET = "products";

export type CatalogueProductType = (typeof PRODUCT_TYPES)[number];
export type CatalogueVisibleFilter = "cloths";

type ProductTranslationRow = {
  lang: string;
  title: string | null;
  material_description: string | null;
};

type ProductVariantRow = {
  id: string;
  variant_name: string | null;
  background_name: string | null;
  ornament_name: string | null;
  size_label: string | null;
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

export type CatalogueVariantImage = {
  id: string;
  url: string;
  imageType: string | null;
};

export type CatalogueVariant = {
  id: string;
  name: string;
  backgroundName: string | null;
  ornamentName: string | null;
  sizeLabel: string | null;
  material: string | null;
  price: number;
  stockStatus: string | null;
  isDefault: boolean;
  images: CatalogueVariantImage[];
};

export type CatalogueProduct = {
  id: string;
  slug: string;
  productType: CatalogueProductType;
  title: string;
  materialDescription: string | null;
  defaultPrice: number;
  variantCount: number;
  mainImage: string | null;
  gallery: string[];
  defaultVariant: CatalogueVariant | null;
  variants: CatalogueVariant[];
  sizes: string[];
};

export const getCatalogueShapeKey = (productType: CatalogueProductType) =>
  productType === "tablecloth_round" ? "round" : "rectangular";

export const isCatalogueVisibleFilter = (
  value: string | undefined,
): value is CatalogueVisibleFilter => value === "cloths";

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
  sortByOrder(images).map((image) => ({
    id: image.id,
    url: toPublicImageUrl(image.storage_path),
    imageType: image.image_type,
  }));

const pickVariantMainImage = (variantImages: CatalogueVariantImage[]) =>
  variantImages.find((image) => image.imageType === "main") ?? variantImages[0] ?? null;

const pickCatalogueCardImage = (variantImages: CatalogueVariantImage[]) =>
  variantImages.find((image) => image.imageType === "lifestyle") ??
  variantImages.find((image) => image.imageType === "main") ??
  variantImages[0] ??
  null;

const pickProductMainImage = (
  variantImages: CatalogueVariantImage[],
  fallbackImages: CatalogueVariantImage[],
) => pickVariantMainImage(variantImages) ?? pickVariantMainImage(fallbackImages);

const unique = <T,>(items: T[]) => [...new Set(items)];

const mapProduct = (row: ProductRow, lang: Locale): CatalogueProduct => {
  const translations = row.product_translations ?? [];
  const translation = getTranslation(translations, lang);
  const allImages = mapVariantImages(row.product_images ?? []);

  const variants = sortByOrder(row.product_variants ?? []).map((variant) => {
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
      material: variant.material,
      price: variant.price ?? 0,
      stockStatus: variant.stock_status,
      isDefault: variant.is_default === true,
      images: variantImages,
    };
  });

  const defaultVariant =
    variants.find((variant) => variant.isDefault) ??
    [...variants].sort((left, right) => left.price - right.price)[0] ??
    null;

  const mainImage = defaultVariant
    ? pickCatalogueCardImage(defaultVariant.images)?.url ??
      pickProductMainImage(defaultVariant.images, allImages)?.url ??
      null
    : pickVariantMainImage(allImages)?.url ?? null;

  const gallery = defaultVariant
    ? unique(defaultVariant.images.map((image) => image.url))
    : unique(allImages.map((image) => image.url));

  return {
    id: row.id,
    slug: row.slug,
    productType: row.product_type,
    title: translation?.title ?? row.slug,
    materialDescription: translation?.material_description ?? null,
    defaultPrice: defaultVariant?.price ?? 0,
    variantCount: variants.length,
    mainImage,
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
      "id, slug, product_type, is_active, sort_order, product_translations(lang, title, material_description), product_variants(id, variant_name, background_name, ornament_name, size_label, material, price, stock_status, is_default, sort_order), product_images(id, variant_id, image_type, storage_path, sort_order)",
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
