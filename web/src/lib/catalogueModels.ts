import type { Locale } from "@/src/i18n/locales";

export type CatalogueProductType = string;

export type CatalogueVariantImage = {
  id: string;
  url: string;
  imageType: string | null;
  sortOrder: number;
};

export type CatalogueVariant = {
  id: string;
  name: string;
  backgroundName: string | null;
  ornamentName: string | null;
  sizeLabel: string | null;
  widthCm?: number | null;
  heightCm?: number | null;
  printWidthCm?: number | null;
  printHeightCm?: number | null;
  material: string | null;
  price: number;
  stockStatus: string | null;
  isDefault: boolean;
  sortOrder: number;
  images: CatalogueVariantImage[];
};

export type CatalogueCategory = {
  id: string | null;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
};

export type CatalogueCollection = {
  id: string | null;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
};

export type CatalogueProduct = {
  id: string;
  slug: string;
  productType: CatalogueProductType;
  category: CatalogueCategory;
  subtypeCode: string | null;
  subtypeLabel: string | null;
  collection: CatalogueCollection | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  materialDescription: string | null;
  careInfo: string | null;
  defaultPrice: number;
  variantCount: number;
  cardImage: string | null;
  mainImage: string | null;
  gallery: string[];
  defaultVariant: CatalogueVariant | null;
  variants: CatalogueVariant[];
  sizes: string[];
};

export type CatalogueProductRecommendationItem = Pick<
  CatalogueProduct,
  | "slug"
  | "title"
  | "productType"
  | "category"
  | "subtypeCode"
  | "subtypeLabel"
  | "cardImage"
  | "mainImage"
  | "defaultPrice"
>;

export type CatalogueCategoryGroup<TProduct extends { category: CatalogueCategory }> = {
  key: string;
  category: CatalogueCategory;
  products: TProduct[];
  count: number;
};

export const CATALOGUE_TOP_ANCHOR = "catalogue-products";

export const getCatalogueTypeLabelKey = (productType: CatalogueProductType) =>
  `catalogue.types.${productType}` as const;

export const humanizeCatalogueProductType = (productType: string) =>
  productType
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const FALLBACK_CATEGORY_LABELS: Record<string, Record<Locale, string>> = {
  works: {
    ka: "ნამუშევრები",
    en: "Works",
    ru: "Работы",
  },
  tablecloth: {
    ka: "სუფრა",
    en: "Tablecloth",
    ru: "Скатерть",
  },
  table_runner: {
    ka: "მაგიდის რანერი",
    en: "Table Runner",
    ru: "Дорожка",
  },
  headscarf: {
    ka: "თავსაფარი",
    en: "Headscarf",
    ru: "Платок",
  },
  pillow: {
    ka: "ბალიში",
    en: "Pillow",
    ru: "Подушка",
  },
  bag: {
    ka: "ჩანთა",
    en: "Bag",
    ru: "Сумка",
  },
  other: {
    ka: "სხვა",
    en: "Other",
    ru: "Другое",
  },
};

const FALLBACK_SUBTYPE_LABELS: Record<string, Record<Locale, string>> = {
  round: {
    ka: "მრგვალი",
    en: "Round",
    ru: "Круглая",
  },
  rectangular: {
    ka: "მართკუთხა",
    en: "Rectangular",
    ru: "Прямоугольная",
  },
};

const LEGACY_PRODUCT_TYPE_TO_CATEGORY: Record<string, { categorySlug: string; subtypeCode: string | null }> = {
  artwork: { categorySlug: "works", subtypeCode: null },
  work: { categorySlug: "works", subtypeCode: null },
  works: { categorySlug: "works", subtypeCode: null },
  painting: { categorySlug: "works", subtypeCode: null },
  paintings: { categorySlug: "works", subtypeCode: null },
  print: { categorySlug: "works", subtypeCode: null },
  prints: { categorySlug: "works", subtypeCode: null },
  tablecloth_round: { categorySlug: "tablecloth", subtypeCode: "round" },
  tablecloth_square: { categorySlug: "tablecloth", subtypeCode: "rectangular" },
  table_runner: { categorySlug: "table_runner", subtypeCode: null },
  scarf: { categorySlug: "headscarf", subtypeCode: null },
  pillow: { categorySlug: "pillow", subtypeCode: null },
  handbag: { categorySlug: "bag", subtypeCode: null },
  phone_case: { categorySlug: "other", subtypeCode: null },
  notebook: { categorySlug: "other", subtypeCode: null },
  tshirt: { categorySlug: "other", subtypeCode: null },
};

export const getLegacyCategoryAssignment = (productType: string) =>
  LEGACY_PRODUCT_TYPE_TO_CATEGORY[productType] ?? null;

export const getFallbackCategoryLabel = (categorySlug: string, lang: Locale) =>
  FALLBACK_CATEGORY_LABELS[categorySlug]?.[lang] ?? humanizeCatalogueProductType(categorySlug);

export const getFallbackSubtypeLabel = (subtypeCode: string, lang: Locale) =>
  FALLBACK_SUBTYPE_LABELS[subtypeCode]?.[lang] ?? humanizeCatalogueProductType(subtypeCode);

export const buildCatalogueProductTypeLabel = ({
  categoryName,
  subtypeLabel,
  lang,
}: {
  categoryName: string;
  subtypeLabel: string | null;
  lang: Locale;
}) => {
  if (!subtypeLabel) {
    return categoryName;
  }

  const loweredCategoryName = categoryName.toLocaleLowerCase(
    lang === "ka" ? "ka-GE" : lang === "ru" ? "ru-RU" : "en-US",
  );

  return `${subtypeLabel} ${loweredCategoryName}`;
};

export const buildCatalogueProductLabel = (
  product: Pick<CatalogueProduct, "category" | "subtypeLabel">,
  lang: Locale,
) =>
  buildCatalogueProductTypeLabel({
    categoryName: product.category.name,
    subtypeLabel: product.subtypeLabel,
    lang,
  });

export const buildFallbackCategory = (
  categorySlug: string,
  lang: Locale,
  options?: {
    id?: string | null;
    description?: string | null;
    sortOrder?: number | null;
  },
): CatalogueCategory => ({
  id: options?.id ?? null,
  slug: categorySlug,
  name: getFallbackCategoryLabel(categorySlug, lang),
  description: options?.description ?? null,
  sortOrder: options?.sortOrder ?? 9999,
});

export const buildFallbackCategoryFromProductType = (
  productType: string,
  lang: Locale,
) => {
  const assignment = getLegacyCategoryAssignment(productType);
  return buildFallbackCategory(assignment?.categorySlug ?? productType, lang);
};

export const resolveSubtypeCodeWithLegacyFallback = ({
  productType,
  subtypeCode,
}: {
  productType: string;
  subtypeCode?: string | null;
}) => subtypeCode ?? getLegacyCategoryAssignment(productType)?.subtypeCode ?? null;

export const resolveCategoryWithLegacyFallback = ({
  categoryId,
  productType,
  lang,
  categoriesById,
  categoriesBySlug,
}: {
  categoryId?: string | null;
  productType: string;
  lang: Locale;
  categoriesById: Map<string, CatalogueCategory>;
  categoriesBySlug: Map<string, CatalogueCategory>;
}) => {
  const categoryById = categoryId ? categoriesById.get(categoryId) ?? null : null;
  if (categoryById) {
    return categoryById;
  }

  const assignment = getLegacyCategoryAssignment(productType);
  const categoryBySlug = assignment?.categorySlug
    ? categoriesBySlug.get(assignment.categorySlug) ?? null
    : null;

  return categoryBySlug ?? buildFallbackCategoryFromProductType(productType, lang);
};

export const groupCatalogueProductsByCategory = <TProduct extends { category: CatalogueCategory }>(
  products: TProduct[],
): CatalogueCategoryGroup<TProduct>[] =>
  Array.from(
    products.reduce<Map<string, CatalogueCategoryGroup<TProduct>>>((groups, product) => {
      const existing = groups.get(product.category.slug);
      if (existing) {
        existing.products.push(product);
        existing.count += 1;
        return groups;
      }

      groups.set(product.category.slug, {
        key: product.category.slug,
        category: product.category,
        products: [product],
        count: 1,
      });
      return groups;
    }, new Map()).values(),
  ).sort(
    (left, right) =>
      left.category.sortOrder - right.category.sortOrder ||
      left.category.name.localeCompare(right.category.name),
  );
