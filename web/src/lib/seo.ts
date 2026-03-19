import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import type {
  CatalogueProduct,
  CatalogueProductRecommendationItem,
  CatalogueProductType,
  CatalogueVisibleFilter,
  CatalogueVariant,
} from "@/src/lib/catalogueModels";
import { getCatalogueSectionLabelKey, getCatalogueTypeLabelKey } from "@/src/lib/catalogueModels";

const ARTIST_NAME = "Levan Margiani";
const BRAND_NAME = "Artiani";
const FACEBOOK_URL = "https://www.facebook.com/LevanMargianiArt";
const INSTAGRAM_URL = "https://www.instagram.com/levanmargiani_art/";

const formatTemplate = (
  template: string,
  values: Record<string, string | number | null | undefined>,
) =>
  Object.entries(values).reduce((output, [key, value]) => {
    const replacement = value == null ? "" : String(value);
    return output.replaceAll(`{${key}}`, replacement);
  }, template);

const cleanText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim();

const truncateText = (value: string | null | undefined, maxLength: number) => {
  const normalized = cleanText(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
};

const uniqueValues = (values: Array<string | null | undefined>) =>
  [...new Set(values.map((value) => cleanText(value)).filter(Boolean))];

const getProductTypeLabel = (productType: CatalogueProductType, dict: Dictionary) =>
  t(dict, getCatalogueTypeLabelKey(productType));

const getVariantLabel = (variant: CatalogueVariant | null | undefined) =>
  cleanText(variant?.backgroundName ?? variant?.name ?? variant?.ornamentName ?? null) || null;

const buildVariantName = (
  productTitle: string,
  variant: CatalogueVariant,
) => {
  const detailParts = uniqueValues([getVariantLabel(variant), variant.sizeLabel]);

  return detailParts.length > 0
    ? `${productTitle} - ${detailParts.join(", ")}`
    : productTitle;
};

const buildAbsoluteUrl = (baseUrl: string, pathname: string) => {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${normalizedBase}${normalizedPath}`;
};

const buildLocalizedPath = (lang: Locale, pathname = "") =>
  `/${lang}${pathname}`;

const mapStockStatusToAvailability = (stockStatus: string | null) => {
  const normalized = cleanText(stockStatus).toLowerCase();

  if (!normalized) {
    return "https://schema.org/InStock";
  }

  if (
    normalized === "out_of_stock" ||
    normalized === "sold_out" ||
    normalized === "unavailable"
  ) {
    return "https://schema.org/OutOfStock";
  }

  if (normalized === "preorder" || normalized === "pre_order") {
    return "https://schema.org/PreOrder";
  }

  return "https://schema.org/InStock";
};

export const buildSeoPageUrl = (baseUrl: string, lang: Locale, pathname = "") =>
  buildAbsoluteUrl(baseUrl, buildLocalizedPath(lang, pathname));

export const buildHomeSeoTitle = (dict: Dictionary) => t(dict, "seo.home.title");

export const buildCatalogueSeoTitle = (
  dict: Dictionary,
  selectedFilterLabel?: string | null,
) =>
  selectedFilterLabel
    ? formatTemplate(t(dict, "seo.catalogue.filterTitle"), {
        section: selectedFilterLabel,
      })
    : t(dict, "seo.catalogue.title");

export const buildProductSeoTitle = (product: CatalogueProduct, dict: Dictionary) =>
  formatTemplate(t(dict, "seo.product.title"), {
    title: product.title,
    artist: ARTIST_NAME,
    brand: BRAND_NAME,
  });

export const buildProductSeoDescription = (product: CatalogueProduct, dict: Dictionary) =>
  formatTemplate(t(dict, "seo.product.descriptionIntro"), {
    title: product.title,
    type: truncateText(getProductTypeLabel(product.productType, dict).toLowerCase(), 80),
    artist: ARTIST_NAME,
    brand: BRAND_NAME,
  });

export const buildProductImageAlt = ({
  title,
  productType,
  dict,
  variantLabel,
  sizeLabel,
  imageIndex,
  totalImages,
}: {
  title: string;
  productType: CatalogueProductType;
  dict: Dictionary;
  variantLabel?: string | null;
  sizeLabel?: string | null;
  imageIndex?: number;
  totalImages?: number;
}) => {
  const parts = [
    formatTemplate(t(dict, "seo.product.imageAlt"), {
      title,
      type: getProductTypeLabel(productType, dict),
      artist: ARTIST_NAME,
      brand: BRAND_NAME,
    }),
    variantLabel ? `${t(dict, "cart.colorLabel")}: ${variantLabel}` : null,
    sizeLabel ? `${t(dict, "cart.sizeLabel")}: ${sizeLabel}` : null,
    imageIndex && totalImages && totalImages > 1
      ? formatTemplate(t(dict, "seo.product.imageNumber"), { index: imageIndex })
      : null,
  ].filter((value): value is string => Boolean(value));

  return parts.join(". ");
};

export const buildRelatedProductImageAlt = (
  product: CatalogueProductRecommendationItem,
  dict: Dictionary,
) =>
  buildProductImageAlt({
    title: product.title,
    productType: product.productType,
    dict,
  });

export const buildHomeOrganizationStructuredData = ({
  baseUrl,
  dict,
  lang,
}: {
  baseUrl: string;
  dict: Dictionary;
  lang: Locale;
}) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${buildSeoPageUrl(baseUrl, lang)}#organization`,
  name: BRAND_NAME,
  url: buildSeoPageUrl(baseUrl, lang),
  logo: buildAbsoluteUrl(baseUrl, "/brand/sheep-seal.png"),
  description: t(dict, "seo.organization.description"),
  founder: {
    "@type": "Person",
    name: ARTIST_NAME,
  },
  sameAs: [FACEBOOK_URL, INSTAGRAM_URL],
  areaServed: {
    "@type": "Country",
    name: "Georgia",
  },
});

export const buildProductStructuredData = ({
  baseUrl,
  dict,
  lang,
  product,
}: {
  baseUrl: string;
  dict: Dictionary;
  lang: Locale;
  product: CatalogueProduct;
}) => {
  const url = buildSeoPageUrl(baseUrl, lang, `/product/${product.slug}`);
  const images = uniqueValues([
    ...(product.gallery ?? []),
    product.mainImage,
    product.cardImage,
  ]);
  const variantPrices = product.variants.map((variant) => variant.price);
  const lowPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : product.defaultPrice;
  const highPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : product.defaultPrice;
  const hasColorVariants = product.variants.some((variant) => Boolean(getVariantLabel(variant)));
  const hasSizeVariants = product.variants.some((variant) => Boolean(variant.sizeLabel));

  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    "@id": `${url}#product`,
    name: product.title,
    description: buildProductSeoDescription(product, dict),
    url,
    image: images,
    brand: {
      "@type": "Brand",
      name: BRAND_NAME,
    },
    category: getProductTypeLabel(product.productType, dict),
    variesBy: [
      hasColorVariants ? "https://schema.org/color" : null,
      hasSizeVariants ? "https://schema.org/size" : null,
    ].filter(Boolean),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "GEL",
      lowPrice: lowPrice.toFixed(2),
      highPrice: highPrice.toFixed(2),
      offerCount: product.variants.length,
      url,
    },
    hasVariant: product.variants.map((variant) => {
      const variantImages = uniqueValues([
        ...variant.images.map((image) => image.url),
        ...images,
      ]);

      return {
        "@type": "Product",
        "@id": `${url}#variant-${variant.id}`,
        name: buildVariantName(product.title, variant),
        sku: variant.id,
        image: variantImages,
        color: getVariantLabel(variant) ?? undefined,
        size: variant.sizeLabel ?? undefined,
        material: cleanText(variant.material) || cleanText(product.materialDescription) || undefined,
        offers: {
          "@type": "Offer",
          priceCurrency: "GEL",
          price: variant.price.toFixed(2),
          availability: mapStockStatusToAvailability(variant.stockStatus),
          url,
        },
      };
    }),
  };
};

export const getCatalogueFilterLabel = (
  filter: CatalogueVisibleFilter | undefined,
  dict: Dictionary,
) => {
  if (!filter) {
    return null;
  }

  return t(dict, getCatalogueSectionLabelKey(filter as never));
};
