import "server-only";

import { products, type Product } from "@/src/data/products";

type CardBackVariant = "postcard" | "greeting";

export type OrderItemInput = {
  slug?: string;
  product_slug?: string;
  productId?: string;
  product_id?: string;
  qty: number;
  options?: Record<string, unknown>;
};

type NormalizedOrderItemOptions = {
  signature: boolean;
  card_back: CardBackVariant | null;
};

export type PricedLineItem = {
  product_id: string;
  product_slug: string;
  title_en: string;
  title_ka: string;
  product_kind: Product["kind"];
  image_url: string;
  qty: number;
  options: NormalizedOrderItemOptions;
  unit_price_cents: number;
  line_total_cents: number;
};

export type PriceCartResult = {
  line_items: PricedLineItem[];
  subtotal_cents: number;
  total_cents: number;
};

const productById = new Map(products.map((product) => [product.id, product]));
const productBySlug = new Map(products.map((product) => [product.slug, product]));

const toCents = (amount: number) => Math.round(amount * 100);

const getBooleanOption = (options: Record<string, unknown>, key: string) =>
  options[key] === true;

const normalizeOptions = (options?: Record<string, unknown>): NormalizedOrderItemOptions => {
  const safeOptions: Record<string, unknown> =
    options && typeof options === "object" ? options : {};
  const cardBackValue =
    safeOptions.cardBack ?? safeOptions.card_back ?? null;
  const cardBackVariant =
    cardBackValue === "postcard" || cardBackValue === "greeting"
      ? cardBackValue
      : null;

  return {
    signature: getBooleanOption(safeOptions, "signature"),
    card_back: cardBackVariant,
  };
};

const resolveProduct = (item: OrderItemInput) => {
  const bySlug = item.slug ?? item.product_slug;
  if (typeof bySlug === "string" && bySlug.trim().length > 0) {
    const product = productBySlug.get(bySlug.trim());
    if (product) return product;
  }

  const byId = item.productId ?? item.product_id;
  if (typeof byId === "string" && byId.trim().length > 0) {
    const product = productById.get(byId.trim());
    if (product) return product;
  }

  return null;
};

const calculateUnitPrice = (
  product: Product,
  options: NormalizedOrderItemOptions,
) => {
  let unitPrice = product.price;
  if (options.signature && typeof product.options.signature === "number") {
    unitPrice += product.options.signature ?? 0;
  }
  return unitPrice;
};

export const priceCart = (items: OrderItemInput[]): PriceCartResult => {
  if (!Array.isArray(items)) {
    throw new Error("priceCart expected an array of items.");
  }

  const lineItems = items.map((item, index) => {
    const product = resolveProduct(item);
    if (!product) {
      throw new Error(
        `priceCart item at index ${index} has unknown product reference.`,
      );
    }

    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1) {
      throw new Error(`priceCart item at index ${index} has invalid qty: ${item.qty}`);
    }

    const normalizedOptions = normalizeOptions(item.options);
    const unitPrice = calculateUnitPrice(product, normalizedOptions);
    const unitPriceCents = toCents(unitPrice);
    const lineTotalCents = unitPriceCents * qty;

    return {
      product_id: product.id,
      product_slug: product.slug,
      title_en: product.name.en,
      title_ka: product.name.ka,
      product_kind: product.kind,
      image_url: product.image,
      qty,
      options: normalizedOptions,
      unit_price_cents: unitPriceCents,
      line_total_cents: lineTotalCents,
    };
  });

  const subtotalCents = lineItems.reduce(
    (sum, item) => sum + item.line_total_cents,
    0,
  );

  return {
    line_items: lineItems,
    subtotal_cents: subtotalCents,
    total_cents: subtotalCents,
  };
};
