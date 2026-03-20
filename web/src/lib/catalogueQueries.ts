import "server-only";

import type { Locale } from "@/src/i18n/locales";
import {
  getFallbackCategoryLabel,
  getFallbackSubtypeLabel,
  getLegacyCategoryAssignment,
  humanizeCatalogueProductType,
  type CatalogueProduct,
  type CatalogueCategory,
  type CatalogueCollection,
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

type TaxonomyTranslationRow = {
  lang: string;
  name: string | null;
  description: string | null;
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

type CategoryRow = {
  id: string;
  slug: string;
  sort_order: number | null;
  is_active: boolean;
  catalogue_category_translations: TaxonomyTranslationRow[];
};

type CollectionRow = {
  id: string;
  slug: string;
  sort_order: number | null;
  is_active: boolean;
  catalogue_collection_translations: TaxonomyTranslationRow[];
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
  category_id?: string | null;
  subtype_code?: string | null;
  collection_id?: string | null;
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

const getTaxonomyTranslation = (
  translations: TaxonomyTranslationRow[],
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

const mapCategoryRow = (row: CategoryRow, lang: Locale): CatalogueCategory => {
  const translation = getTaxonomyTranslation(row.catalogue_category_translations ?? [], lang);

  return {
    id: row.id,
    slug: row.slug,
    name: translation?.name?.trim() || getFallbackCategoryLabel(row.slug, lang),
    description: translation?.description?.trim() || null,
    sortOrder: row.sort_order ?? 9999,
  };
};

const mapCollectionRow = (row: CollectionRow, lang: Locale): CatalogueCollection => {
  const translation = getTaxonomyTranslation(row.catalogue_collection_translations ?? [], lang);

  return {
    id: row.id,
    slug: row.slug,
    name: translation?.name?.trim() || humanizeCatalogueProductType(row.slug),
    description: translation?.description?.trim() || null,
    sortOrder: row.sort_order ?? 9999,
  };
};

const buildFallbackCategory = (productType: string, lang: Locale): CatalogueCategory => {
  const assignment = getLegacyCategoryAssignment(productType);
  const slug = assignment?.categorySlug ?? productType;

  return {
    id: null,
    slug,
    name: getFallbackCategoryLabel(slug, lang),
    description: null,
    sortOrder: 9999,
  };
};

const resolveCategory = ({
  row,
  lang,
  categoriesById,
  categoriesBySlug,
}: {
  row: ProductRow;
  lang: Locale;
  categoriesById: Map<string, CatalogueCategory>;
  categoriesBySlug: Map<string, CatalogueCategory>;
}) => {
  const categoryById = row.category_id ? categoriesById.get(row.category_id) ?? null : null;
  if (categoryById) {
    return categoryById;
  }

  const assignment = getLegacyCategoryAssignment(row.product_type);
  const categoryBySlug = assignment?.categorySlug
    ? categoriesBySlug.get(assignment.categorySlug) ?? null
    : null;

  return categoryBySlug ?? buildFallbackCategory(row.product_type, lang);
};

const resolveSubtypeCode = (row: ProductRow) =>
  row.subtype_code ?? getLegacyCategoryAssignment(row.product_type)?.subtypeCode ?? null;

const resolveCollection = ({
  row,
  collectionsById,
}: {
  row: ProductRow;
  collectionsById: Map<string, CatalogueCollection>;
}) => (row.collection_id ? collectionsById.get(row.collection_id) ?? null : null);

const mapProduct = ({
  row,
  lang,
  categoriesById,
  categoriesBySlug,
  collectionsById,
}: {
  row: ProductRow;
  lang: Locale;
  categoriesById: Map<string, CatalogueCategory>;
  categoriesBySlug: Map<string, CatalogueCategory>;
  collectionsById: Map<string, CatalogueCollection>;
}): CatalogueProduct => {
  const translations = row.product_translations ?? [];
  const translation = getTranslation(translations, lang);
  const allImages = mapVariantImages(row.product_images ?? []);
  const category = resolveCategory({ row, lang, categoriesById, categoriesBySlug });
  const subtypeCode = resolveSubtypeCode(row);
  const subtypeLabel = subtypeCode ? getFallbackSubtypeLabel(subtypeCode, lang) : null;
  const collection = resolveCollection({ row, collectionsById });

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
    category,
    subtypeCode,
    subtypeLabel,
    collection,
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

const fetchCategoryRows = async (): Promise<CategoryRow[]> => {
  const supabase = getSupabasePublicReadClient();
  const { data, error } = await supabase
    .from("catalogue_categories")
    .select("id, slug, sort_order, is_active, catalogue_category_translations(lang, name, description)")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.warn("[catalogueQueries] category fetch unavailable; using legacy category fallback", {
      ...readSupabaseErrorDetails(error),
      clientPath: "public",
    });
    return [];
  }

  return (data ?? []) as CategoryRow[];
};

const fetchCollectionRows = async (): Promise<CollectionRow[]> => {
  const supabase = getSupabasePublicReadClient();
  const { data, error } = await supabase
    .from("catalogue_collections")
    .select("id, slug, sort_order, is_active, catalogue_collection_translations(lang, name, description)")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.warn("[catalogueQueries] collection fetch unavailable; continuing without collection taxonomy", {
      ...readSupabaseErrorDetails(error),
      clientPath: "public",
    });
    return [];
  }

  return (data ?? []) as CollectionRow[];
};

const fetchProductRows = async (): Promise<ProductRow[]> => {
  console.info("[catalogueQueries] fetching catalogue products", {
    clientPath: "public",
  });
  const supabase = getSupabasePublicReadClient();
  const extendedSelect =
    "id, slug, product_type, is_active, sort_order, category_id, subtype_code, collection_id, product_translations(lang, title, subtitle, description, material_description, care_info), product_variants(*), product_images(id, variant_id, image_type, storage_path, sort_order)";

  const legacySelect =
    "id, slug, product_type, is_active, sort_order, product_translations(lang, title, subtitle, description, material_description, care_info), product_variants(*), product_images(id, variant_id, image_type, storage_path, sort_order)";

  const extendedResult = await supabase
    .from("products")
    .select(extendedSelect)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (extendedResult.error) {
    const legacyResult = await supabase
      .from("products")
      .select(legacySelect)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (legacyResult.error) {
      console.error("[catalogueQueries] product fetch failed", {
        ...readSupabaseErrorDetails(legacyResult.error),
        clientPath: "public",
      });
      throw new Error(`[catalogueQueries] Failed to fetch products: ${legacyResult.error.message}`);
    }

    console.warn("[catalogueQueries] extended taxonomy fields unavailable on products; using legacy product_type fallback", {
      ...readSupabaseErrorDetails(extendedResult.error),
      clientPath: "public",
    });

    return (legacyResult.data ?? []) as ProductRow[];
  }

  return (extendedResult.data ?? []) as ProductRow[];
};

export const getCatalogueProducts = async (
  lang: Locale,
  categorySlug?: string,
) => {
  const [rows, categoryRows, collectionRows] = await Promise.all([
    fetchProductRows(),
    fetchCategoryRows(),
    fetchCollectionRows(),
  ]);

  const categories = categoryRows.map((row) => mapCategoryRow(row, lang));
  const collections = collectionRows.map((row) => mapCollectionRow(row, lang));
  const categoriesById = new Map(categories.map((category) => [category.id ?? "", category]));
  const categoriesBySlug = new Map(categories.map((category) => [category.slug, category]));
  const collectionsById = new Map(collections.map((collection) => [collection.id ?? "", collection]));

  return rows
    .map((row) =>
      mapProduct({
        row,
        lang,
        categoriesById,
        categoriesBySlug,
        collectionsById,
      }),
    )
    .filter((product) => !categorySlug || product.category.slug === categorySlug);
};

export const getProductBySlug = async (slug: string, lang: Locale) => {
  const products = await getCatalogueProducts(lang);
  const product = products.find((entry) => entry.slug === slug);

  return product ?? null;
};
