import "server-only";

import { getCatalogueProducts } from "@/src/lib/catalogueQueries";
import type { CatalogueProduct } from "@/src/lib/catalogueModels";
import { getExternalPublicBaseUrl } from "@/src/lib/env.server";
import { buildSeoPageUrl } from "@/src/lib/seo";

type MerchantAvailability = "in stock" | "out of stock" | "preorder";

type MerchantFeedItem = {
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  availability: MerchantAvailability;
  price: string;
  condition: "new";
  brand: string;
  googleProductCategory?: string;
  productType?: string;
  itemGroupId?: string;
};

type MerchantFeedSkipReason =
  | "missing_title"
  | "missing_description"
  | "missing_image"
  | "invalid_price"
  | "not_sellable";

type MerchantFeedSkip = {
  slug: string;
  reason: MerchantFeedSkipReason;
};

const FEED_LOCALE = "en";
const FEED_CURRENCY = "GEL";
const FEED_BRAND = "Artiani";

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const cleanText = (value: string | null | undefined) => value?.replace(/\s+/g, " ").trim() ?? "";

const formatFeedPrice = (price: number) => `${price.toFixed(2)} ${FEED_CURRENCY}`;

const uniqueValues = (values: Array<string | null | undefined>) =>
  [...new Set(values.map((value) => cleanText(value)).filter(Boolean))];

const mapAvailability = (stockStatuses: Array<string | null | undefined>): MerchantAvailability => {
  const normalized = stockStatuses.map((status) => status?.trim().toLowerCase() ?? "");

  if (normalized.some((status) => status === "preorder" || status === "pre_order")) {
    return "preorder";
  }

  if (
    normalized.some(
      (status) =>
        status === "" ||
        (status !== "reserved" && status !== "out_of_stock" && status !== "sold_out" && status !== "unavailable"),
    )
  ) {
    return "in stock";
  }

  return "out of stock";
};

const getGoogleProductCategory = (categorySlug: string) => {
  switch (categorySlug) {
    case "tablecloth":
    case "table_runner":
    case "pillow":
      return "Home & Garden";
    case "headscarf":
      return "Apparel & Accessories";
    case "bag":
      return "Apparel & Accessories > Handbags, Wallets & Cases";
    case "phone_case":
      return "Electronics > Communications > Telephony > Mobile Phone Accessories";
    default:
      return undefined;
  }
};

const getProductTypePath = ({
  categoryName,
  subtypeLabel,
}: {
  categoryName: string;
  subtypeLabel: string | null;
}) => [categoryName, cleanText(subtypeLabel) || null].filter((part): part is string => Boolean(part)).join(" > ");

const getFeedTypeLabel = (product: Pick<CatalogueProduct, "category" | "subtypeLabel">) => {
  const categoryName = cleanText(product.category.name);
  const subtypeLabel = cleanText(product.subtypeLabel);

  if (!categoryName) {
    return subtypeLabel;
  }

  if (!subtypeLabel) {
    return categoryName;
  }

  return categoryName.toLowerCase().includes(subtypeLabel.toLowerCase())
    ? categoryName
    : `${subtypeLabel} ${categoryName}`;
};

const buildFeedTitle = (product: Pick<CatalogueProduct, "title" | "category" | "subtypeLabel">) => {
  const motif = cleanText(product.title);
  const typeLabel = getFeedTypeLabel(product);

  if (!motif) {
    return typeLabel;
  }

  if (!typeLabel) {
    return motif;
  }

  return motif.toLowerCase().includes(typeLabel.toLowerCase()) ? motif : `${motif} ${typeLabel}`;
};

const getFeedSizeSummary = (product: Pick<CatalogueProduct, "sizes" | "defaultVariant">) => {
  const sizes = uniqueValues([
    ...product.sizes,
    product.defaultVariant?.sizeLabel ?? null,
  ]);

  if (sizes.length === 0) {
    return null;
  }

  if (sizes.length === 1) {
    return {
      short: sizes[0],
      long: `Size: ${sizes[0]}.`,
    };
  }

  return {
    short: sizes.join(", "),
    long: `Available sizes: ${sizes.join(", ")}.`,
  };
};

const getFeedMaterialSummary = (product: Pick<CatalogueProduct, "materialDescription" | "defaultVariant">) => {
  const material = cleanText(product.defaultVariant?.materialInfo?.name ?? product.defaultVariant?.material);
  const materialDescription = cleanText(product.materialDescription);

  if (materialDescription) {
    return materialDescription.endsWith(".") ? materialDescription : `${materialDescription}.`;
  }

  if (material) {
    return `Material: ${material}.`;
  }

  return null;
};

const isRichDescription = (description: string) => description.length >= 48 && /[.:;]/.test(description);
const isSizeOnlyDescription = (description: string) => /^[\d\s×x.,/-]+(?:cm|სმ)\.?$/i.test(description);
const isSizeRangeDescription = (description: string) =>
  /^available sizes?:/i.test(description) || /^available in (?:two|multiple) sizes/i.test(description);

const buildDescription = ({
  product,
  description,
  subtitle,
  materialDescription,
}: {
  product: Pick<
    CatalogueProduct,
    "title" | "category" | "subtypeLabel" | "sizes" | "defaultVariant" | "materialDescription"
  >;
  description: string | null;
  subtitle: string | null;
  materialDescription: string | null;
}) => {
  const cleanedDescription = cleanText(description);

  if (isRichDescription(cleanedDescription)) {
    return cleanedDescription;
  }

  const title = buildFeedTitle(product);
  const typeLabel = getFeedTypeLabel(product).toLowerCase();
  const sizeSummary = getFeedSizeSummary(product);
  const materialSummary = getFeedMaterialSummary({
    ...product,
    materialDescription,
  });
  const subtitleSummary = cleanText(subtitle);
  const fallbackDescription = cleanText(description);
  const normalizedTypeLabel = typeLabel.toLowerCase();
  const normalizedSubtitle = subtitleSummary.toLowerCase();
  const shouldIncludeFallbackDescription =
    Boolean(fallbackDescription) &&
    !isSizeOnlyDescription(fallbackDescription) &&
    !isSizeRangeDescription(fallbackDescription) &&
    fallbackDescription.toLowerCase() !== normalizedTypeLabel;
  const shouldIncludeSubtitle =
    Boolean(subtitleSummary) &&
    !fallbackDescription &&
    !isSizeOnlyDescription(subtitleSummary) &&
    !isSizeRangeDescription(subtitleSummary) &&
    normalizedSubtitle !== normalizedTypeLabel;

  return [
    title && typeLabel ? `${title} by ${FEED_BRAND}.` : null,
    shouldIncludeSubtitle ? `${subtitleSummary}.` : null,
    sizeSummary?.long ?? null,
    materialSummary,
    shouldIncludeFallbackDescription ? `${fallbackDescription}.` : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ");
};

export const buildMerchantCenterFeed = async () => {
  const baseUrl = getExternalPublicBaseUrl();
  const products = await getCatalogueProducts(FEED_LOCALE);
  const items: MerchantFeedItem[] = [];
  const skipped: MerchantFeedSkip[] = [];

  for (const product of products) {
    const title = buildFeedTitle(product);
    const description = buildDescription({
      product,
      description: product.description,
      subtitle: product.subtitle,
      materialDescription: product.materialDescription,
    });
    const imageLink = cleanText(product.mainImage) || cleanText(product.cardImage);
    const availability = mapAvailability(product.variants.map((variant) => variant.stockStatus));
    const categoryName = cleanText(product.category.name);
    const price = product.defaultPrice;

    if (!title) {
      skipped.push({ slug: product.slug, reason: "missing_title" });
      continue;
    }

    if (!description) {
      skipped.push({ slug: product.slug, reason: "missing_description" });
      continue;
    }

    if (!imageLink) {
      skipped.push({ slug: product.slug, reason: "missing_image" });
      continue;
    }

    if (!Number.isFinite(price) || price <= 0) {
      skipped.push({ slug: product.slug, reason: "invalid_price" });
      continue;
    }

    if (availability === "out of stock") {
      skipped.push({ slug: product.slug, reason: "not_sellable" });
      continue;
    }

    items.push({
      id: product.id,
      title,
      description,
      link: buildSeoPageUrl(baseUrl, FEED_LOCALE, `/product/${product.slug}`),
      imageLink,
      availability,
      price: formatFeedPrice(price),
      condition: "new",
      brand: FEED_BRAND,
      googleProductCategory: getGoogleProductCategory(product.category.slug),
      productType: categoryName
        ? getProductTypePath({
            categoryName,
            subtypeLabel: product.subtypeLabel,
          })
        : undefined,
      itemGroupId: product.variants.length > 1 ? product.id : undefined,
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(FEED_BRAND)}</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>${escapeXml("Artiani product feed for Google Merchant Center")}</description>
${items
  .map(
    (item) => `    <item>
      <g:id>${escapeXml(item.id)}</g:id>
      <g:title>${escapeXml(item.title)}</g:title>
      <g:description>${escapeXml(item.description)}</g:description>
      <g:link>${escapeXml(item.link)}</g:link>
      <g:image_link>${escapeXml(item.imageLink)}</g:image_link>
      <g:availability>${escapeXml(item.availability)}</g:availability>
      <g:price>${escapeXml(item.price)}</g:price>
      <g:condition>${escapeXml(item.condition)}</g:condition>
      <g:brand>${escapeXml(item.brand)}</g:brand>${item.googleProductCategory ? `
      <g:google_product_category>${escapeXml(item.googleProductCategory)}</g:google_product_category>` : ""}${item.productType ? `
      <g:product_type>${escapeXml(item.productType)}</g:product_type>` : ""}${item.itemGroupId ? `
      <g:item_group_id>${escapeXml(item.itemGroupId)}</g:item_group_id>` : ""}
    </item>`,
  )
  .join("\n")}
  </channel>
</rss>`;

  return {
    xml,
    items,
    skipped,
  };
};
