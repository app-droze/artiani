import "server-only";

import type { Locale } from "@/src/i18n/locales";
import {
  buildFallbackCategory,
  getFallbackBackgroundFromName,
  getFallbackSubtypeLabel,
  humanizeCatalogueProductType,
  resolveCategoryWithLegacyFallback,
  resolveSubtypeCodeWithLegacyFallback,
  type CatalogueBackground,
  type CatalogueMaterial,
  type CatalogueProduct,
  type CatalogueCategory,
  type CatalogueCollection,
  type CatalogueProductType,
} from "@/src/lib/catalogueModels";
import {
  pickMainProductImage,
  pickPrimaryProductImage,
  resolveProductGalleryImages,
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
  plural_name?: string | null;
  description: string | null;
};

type MaterialTranslationRow = {
  lang: string;
  name: string | null;
};

type ProductVariantRow = {
  id: string;
  variant_name: string | null;
  background_id?: string | null;
  background_name: string | null;
  ornament_name: string | null;
  size_label: string | null;
  material_id?: string | null;
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

type BackgroundRow = {
  id: string;
  code: string;
  name: string;
  display_type: "color" | "image";
  hex_value: string | null;
  image_url: string | null;
  sort_order: number | null;
  is_active: boolean;
};

type MaterialRow = {
  id: string;
  code: string;
  sort_order: number | null;
  is_active: boolean;
  catalogue_material_translations: MaterialTranslationRow[];
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

type CatalogueMappingContext = {
  categoriesById: Map<string, CatalogueCategory>;
  categoriesBySlug: Map<string, CatalogueCategory>;
  collectionsById: Map<string, CatalogueCollection>;
  backgroundsById: Map<string, CatalogueBackground>;
  materialsById: Map<string, CatalogueMaterial>;
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

const getMaterialTranslation = (
  translations: MaterialTranslationRow[],
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
    storagePath: image.storage_path,
    variantId: image.variant_id,
    imageType: image.image_type,
    sortOrder: image.sort_order ?? 9999,
  }));

const derivePaintingThumbnailUrl = (image: { storagePath?: string | null; url?: string | null } | null) => {
  const storagePath = image?.storagePath ?? null;
  const url = image?.url ?? null;

  if (!storagePath || !url || !storagePath.includes("-front.")) {
    return null;
  }

  const thumbnailPath = storagePath.replace("-front.", "-front-thumbnail.");
  return url.replace(storagePath, thumbnailPath);
};

const unique = <T,>(items: T[]) => [...new Set(items)];
const shuffleItems = <T,>(items: T[]) => {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
};
const buildVariantStyleKey = (variant: ProductVariantRow) =>
  [variant.variant_name, variant.background_name, variant.ornament_name]
    .filter(Boolean)
    .join("|");

const PINNED_DEFAULT_VARIANT_BACKGROUND_BY_PRODUCT_SLUG: Record<string, string> = {
  "cloth-rounded": "white",
  "cloth-rectangular": "golden",
  qajarebi: "navy",
  kajari: "antique_bordeaux",
  "pillow-shepherd": "antique_olive",
  "pillow-couple": "antique_bordeaux",
  "pillow-lamb": "navy",
  "pillow-family": "golden",
  "table-runner-couple": "navy",
  "table-runner-large-family-garden": "antique_bordeaux",
  "table-runner-large-couple": "golden",
  "table-runner-kajari": "sky",
  "table-runner-lamb": "forest_green",
  "table-runner-family": "antique_olive",
};

const getVariantBackgroundCode = ({
  background,
  backgroundName,
}: {
  background: CatalogueBackground | null;
  backgroundName: string | null;
}) => background?.code ?? getFallbackBackgroundFromName(backgroundName)?.code ?? null;

const pickCatalogueDefaultVariant = <T extends {
  background: CatalogueBackground | null;
  backgroundName: string | null;
  isDefault?: boolean | null;
}>(
  productSlug: string,
  variants: T[],
) => {
  const pinnedBackgroundCode = PINNED_DEFAULT_VARIANT_BACKGROUND_BY_PRODUCT_SLUG[productSlug];
  return (
    (pinnedBackgroundCode
      ? variants.find((variant) => getVariantBackgroundCode(variant) === pinnedBackgroundCode) ?? null
      : null) ??
    variants.find((variant) => variant.isDefault === true) ??
    variants[0] ??
    null
  );
};

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
    name: translation?.name?.trim() || buildFallbackCategory(row.slug, lang).name,
    pluralName: translation?.plural_name?.trim() || null,
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

const mapBackgroundRow = (row: BackgroundRow): CatalogueBackground => ({
  id: row.id,
  code: row.code,
  name: row.name,
  displayType: row.display_type,
  hexValue: row.hex_value,
  imageUrl: row.image_url,
  sortOrder: row.sort_order ?? 9999,
});

const mapMaterialRow = (row: MaterialRow, lang: Locale): CatalogueMaterial => {
  const translation = getMaterialTranslation(row.catalogue_material_translations ?? [], lang);

  return {
    id: row.id,
    code: row.code,
    name: translation?.name?.trim() || humanizeCatalogueProductType(row.code),
    sortOrder: row.sort_order ?? 9999,
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
}) =>
  resolveCategoryWithLegacyFallback({
    categoryId: row.category_id,
    productType: row.product_type,
    lang,
    categoriesById,
    categoriesBySlug,
  });

const resolveSubtypeCode = (row: ProductRow) =>
  resolveSubtypeCodeWithLegacyFallback({
    productType: row.product_type,
    subtypeCode: row.subtype_code,
  });

const resolveCollection = ({
  row,
  collectionsById,
}: {
  row: ProductRow;
  collectionsById: Map<string, CatalogueCollection>;
}) => (row.collection_id ? collectionsById.get(row.collection_id) ?? null : null);

const resolveBackground = ({
  variant,
  backgroundsById,
}: {
  variant: ProductVariantRow;
  backgroundsById: Map<string, CatalogueBackground>;
}) =>
  (variant.background_id ? backgroundsById.get(variant.background_id) ?? null : null) ??
  getFallbackBackgroundFromName(variant.background_name);

const resolveMaterial = ({
  variant,
  materialsById,
}: {
  variant: ProductVariantRow;
  materialsById: Map<string, CatalogueMaterial>;
}) => (variant.material_id ? materialsById.get(variant.material_id) ?? null : null);

const mapProduct = ({
  row,
  lang,
  categoriesById,
  categoriesBySlug,
  collectionsById,
  backgroundsById,
  materialsById,
}: {
  row: ProductRow;
  lang: Locale;
  categoriesById: Map<string, CatalogueCategory>;
  categoriesBySlug: Map<string, CatalogueCategory>;
  collectionsById: Map<string, CatalogueCollection>;
  backgroundsById: Map<string, CatalogueBackground>;
  materialsById: Map<string, CatalogueMaterial>;
}): CatalogueProduct => {
  const translations = row.product_translations ?? [];
  const translation = getTranslation(translations, lang);
  const allImages = mapVariantImages(row.product_images ?? []);
  const productLevelImages = allImages.filter((image) => image.variantId === null);
  const category = resolveCategory({ row, lang, categoriesById, categoriesBySlug });
  const subtypeCode = resolveSubtypeCode(row);
  const subtypeLabel = subtypeCode ? getFallbackSubtypeLabel(subtypeCode, lang) : null;
  const collection = resolveCollection({ row, collectionsById });

  const sortedVariantRows = sortByOrder(row.product_variants ?? []);
  const colorCount = unique(sortedVariantRows.map((variant) => buildVariantStyleKey(variant))).length;

  const variants = sortedVariantRows.map((variant) => {
    const variantImages = allImages.filter((image) => image.variantId === variant.id);

    return {
      id: variant.id,
      name: variant.variant_name ?? variant.background_name ?? variant.ornament_name ?? variant.id,
      backgroundName: variant.background_name,
      background: resolveBackground({ variant, backgroundsById }),
      ornamentName: variant.ornament_name,
      sizeLabel: variant.size_label,
      materialInfo: resolveMaterial({ variant, materialsById }),
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

  const defaultVariant = pickCatalogueDefaultVariant(row.slug, variants);

  const defaultPrice =
    defaultVariant?.price ??
    [...variants].sort((left, right) => left.price - right.price)[0]?.price ??
    0;

  const defaultGallery = defaultVariant
    ? resolveProductGalleryImages({
        variantImages: defaultVariant.images,
        productImages: productLevelImages,
      })
    : resolveProductGalleryImages({
        variantImages: [],
        productImages: productLevelImages,
      });

  const heroMainImage = defaultVariant
    ? pickMainProductImage(defaultGallery)?.url ??
      pickPrimaryProductImage(defaultGallery)?.url ??
      null
    : pickMainProductImage(productLevelImages)?.url ??
      pickPrimaryProductImage(productLevelImages)?.url ??
      null;

  const defaultCardImage = defaultVariant
    ? defaultGallery[0] ?? null
    : pickMainProductImage(productLevelImages) ??
      pickPrimaryProductImage(productLevelImages) ??
      null;
  const cardImage =
    row.product_type === "painting"
      ? derivePaintingThumbnailUrl(defaultCardImage) ?? defaultCardImage?.url ?? null
      : defaultCardImage?.url ?? null;

  const gallery = productLevelImages;

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

const buildCatalogueMappingContext = ({
  lang,
  categoryRows,
  collectionRows,
  backgroundRows,
  materialRows,
}: {
  lang: Locale;
  categoryRows: CategoryRow[];
  collectionRows: CollectionRow[];
  backgroundRows: BackgroundRow[];
  materialRows: MaterialRow[];
}): CatalogueMappingContext => {
  const categories = categoryRows.map((row) => mapCategoryRow(row, lang));
  const collections = collectionRows.map((row) => mapCollectionRow(row, lang));
  const backgrounds = backgroundRows.map((row) => mapBackgroundRow(row));
  const materials = materialRows.map((row) => mapMaterialRow(row, lang));

  return {
    categoriesById: new Map(categories.map((category) => [category.id ?? "", category])),
    categoriesBySlug: new Map(categories.map((category) => [category.slug, category])),
    collectionsById: new Map(collections.map((collection) => [collection.id ?? "", collection])),
    backgroundsById: new Map(backgrounds.map((background) => [background.id ?? "", background])),
    materialsById: new Map(materials.map((material) => [material.id ?? "", material])),
  };
};

const mapProductRows = ({
  rows,
  lang,
  context,
}: {
  rows: ProductRow[];
  lang: Locale;
  context: CatalogueMappingContext;
}) =>
  rows.map((row) =>
    mapProduct({
      row,
      lang,
      categoriesById: context.categoriesById,
      categoriesBySlug: context.categoriesBySlug,
      collectionsById: context.collectionsById,
      backgroundsById: context.backgroundsById,
      materialsById: context.materialsById,
    }),
  );

const fetchBackgroundRows = async (): Promise<BackgroundRow[]> => {
  const supabase = getSupabasePublicReadClient();
  const { data, error } = await supabase
    .from("catalogue_backgrounds")
    .select("id, code, name, display_type, hex_value, image_url, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.warn("[catalogueQueries] background fetch unavailable; using background_name fallback", {
      ...readSupabaseErrorDetails(error),
      clientPath: "public",
    });
    return [];
  }

  return (data ?? []) as BackgroundRow[];
};

const fetchMaterialRows = async (): Promise<MaterialRow[]> => {
  const supabase = getSupabasePublicReadClient();
  const { data, error } = await supabase
    .from("catalogue_materials")
    .select("id, code, sort_order, is_active, catalogue_material_translations(lang, name)")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.warn("[catalogueQueries] material fetch unavailable; using variant.material fallback", {
      ...readSupabaseErrorDetails(error),
      clientPath: "public",
    });
    return [];
  }

  return (data ?? []) as MaterialRow[];
};

const fetchCategoryRows = async (): Promise<CategoryRow[]> => {
  const supabase = getSupabasePublicReadClient();
  const { data, error } = await supabase
    .from("catalogue_categories")
    .select("id, slug, sort_order, is_active, catalogue_category_translations(lang, name, plural_name, description)")
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

const fetchProductRowBySlug = async (slug: string): Promise<ProductRow | null> => {
  const supabase = getSupabasePublicReadClient();
  const extendedSelect =
    "id, slug, product_type, is_active, sort_order, category_id, subtype_code, collection_id, product_translations(lang, title, subtitle, description, material_description, care_info), product_variants(*), product_images(id, variant_id, image_type, storage_path, sort_order)";
  const legacySelect =
    "id, slug, product_type, is_active, sort_order, product_translations(lang, title, subtitle, description, material_description, care_info), product_variants(*), product_images(id, variant_id, image_type, storage_path, sort_order)";

  const extendedResult = await supabase
    .from("products")
    .select(extendedSelect)
    .eq("is_active", true)
    .eq("slug", slug)
    .maybeSingle();

  if (extendedResult.error) {
    const legacyResult = await supabase
      .from("products")
      .select(legacySelect)
      .eq("is_active", true)
      .eq("slug", slug)
      .maybeSingle();

    if (legacyResult.error) {
      console.error("[catalogueQueries] single product fetch failed", {
        slug,
        ...readSupabaseErrorDetails(legacyResult.error),
        clientPath: "public",
      });
      throw new Error(
        `[catalogueQueries] Failed to fetch product by slug: ${legacyResult.error.message}`,
      );
    }

    return (legacyResult.data as ProductRow | null) ?? null;
  }

  return (extendedResult.data as ProductRow | null) ?? null;
};

const fetchRelatedProductRows = async ({
  currentSlug,
  currentCategoryId,
  currentProductType,
  limit,
}: {
  currentSlug: string;
  currentCategoryId?: string | null;
  currentProductType: CatalogueProductType;
  limit: number;
}): Promise<ProductRow[]> => {
  const supabase = getSupabasePublicReadClient();
  const extendedSelect =
    "id, slug, product_type, is_active, sort_order, category_id, subtype_code, collection_id, product_translations(lang, title, subtitle, description, material_description, care_info), product_variants(*), product_images(id, variant_id, image_type, storage_path, sort_order)";
  const legacySelect =
    "id, slug, product_type, is_active, sort_order, product_translations(lang, title, subtitle, description, material_description, care_info), product_variants(*), product_images(id, variant_id, image_type, storage_path, sort_order)";

  const buildExtendedQuery = () => {
    let query = supabase
      .from("products")
      .select(extendedSelect)
      .eq("is_active", true)
      .neq("slug", currentSlug)
      .order("sort_order", { ascending: true })
      .limit(limit * 3);

    if (currentCategoryId) {
      query = query.eq("category_id", currentCategoryId);
    } else {
      query = query.eq("product_type", currentProductType);
    }

    return query;
  };

  const extendedResult = await buildExtendedQuery();

  if (extendedResult.error) {
    const legacyResult = await supabase
      .from("products")
      .select(legacySelect)
      .eq("is_active", true)
      .neq("slug", currentSlug)
      .eq("product_type", currentProductType)
      .order("sort_order", { ascending: true })
      .limit(limit * 3);

    if (legacyResult.error) {
      console.error("[catalogueQueries] related product fetch failed", {
        currentSlug,
        ...readSupabaseErrorDetails(legacyResult.error),
        clientPath: "public",
      });
      throw new Error(
        `[catalogueQueries] Failed to fetch related products: ${legacyResult.error.message}`,
      );
    }

    return (legacyResult.data ?? []) as ProductRow[];
  }

  const primaryRows = (extendedResult.data ?? []) as ProductRow[];
  if (primaryRows.length >= limit) {
    return primaryRows;
  }

  const fallbackResult = await supabase
    .from("products")
    .select(extendedSelect)
    .eq("is_active", true)
    .neq("slug", currentSlug)
    .order("sort_order", { ascending: true })
    .limit(limit * 4);

  if (fallbackResult.error) {
    console.warn("[catalogueQueries] related product fallback fetch failed", {
      currentSlug,
      ...readSupabaseErrorDetails(fallbackResult.error),
      clientPath: "public",
    });
    return primaryRows;
  }

  const mergedRows = [...primaryRows, ...((fallbackResult.data ?? []) as ProductRow[])];
  const seen = new Set<string>();

  return mergedRows.filter((row) => {
    if (seen.has(row.id)) {
      return false;
    }

    seen.add(row.id);
    return true;
  });
};

const fetchCatalogueMappingContext = async (lang: Locale): Promise<CatalogueMappingContext> => {
  const [categoryRows, collectionRows, backgroundRows, materialRows] = await Promise.all([
    fetchCategoryRows(),
    fetchCollectionRows(),
    fetchBackgroundRows(),
    fetchMaterialRows(),
  ]);

  return buildCatalogueMappingContext({
    lang,
    categoryRows,
    collectionRows,
    backgroundRows,
    materialRows,
  });
};

export const getCatalogueProducts = async (
  lang: Locale,
  categorySlug?: string,
) => {
  const [rows, context] = await Promise.all([
    fetchProductRows(),
    fetchCatalogueMappingContext(lang),
  ]);

  return mapProductRows({
    rows,
    lang,
    context,
  })
    .filter((product) => !categorySlug || product.category.slug === categorySlug);
};

export const getProductBySlug = async (slug: string, lang: Locale) => {
  const [row, context] = await Promise.all([
    fetchProductRowBySlug(slug),
    fetchCatalogueMappingContext(lang),
  ]);

  if (!row) {
    return null;
  }

  return mapProductRows({
    rows: [row],
    lang,
    context,
  })[0] ?? null;
};

export const getRelatedProducts = async ({
  currentProduct,
  lang,
  limit = 4,
}: {
  currentProduct: CatalogueProduct;
  lang: Locale;
  limit?: number;
}) => {
  const [rows, context] = await Promise.all([
    fetchRelatedProductRows({
      currentSlug: currentProduct.slug,
      currentCategoryId: currentProduct.category.id,
      currentProductType: currentProduct.productType,
      limit,
    }),
    fetchCatalogueMappingContext(lang),
  ]);
  const relatedProducts = shuffleItems(
    mapProductRows({
      rows,
      lang,
      context,
    }).filter((product) => product.slug !== currentProduct.slug),
  );

  return relatedProducts
    .slice(0, limit)
    .map((item) => ({
      slug: item.slug,
      title: item.title,
      productType: item.productType,
      category: item.category,
      subtypeCode: item.subtypeCode,
      subtypeLabel: item.subtypeLabel,
      cardImage: item.cardImage,
      mainImage: item.mainImage,
      defaultPrice: item.defaultPrice,
    }));
};
