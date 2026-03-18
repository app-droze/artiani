import { NextRequest, NextResponse } from "next/server";
import { supabaseEnvDiagnostics } from "@/src/lib/env.server";
import { pickPrimaryProductImage } from "@/src/lib/productImages";
import { getSupabasePublicReadClient } from "@/src/lib/supabasePublic";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";

export const runtime = "nodejs";

const GENERIC_ERROR_MESSAGE = "Order not found.";
const STORAGE_BUCKET = "products";

class ValidationError extends Error {}

type ParsedLookupRequest = {
  code: string;
  contact: string;
};

type OrderLookupRow = {
  id: string;
  order_code: string;
  status: string;
  currency: string;
  address: string;
  customer_name: string;
  email: string;
  phone: string;
  note: string | null;
  total_amount: number;
  created_at: string;
};

type OrderItemLookupRow = {
  product_id: string;
  variant_id: string;
  product_slug: string;
  product_kind: string;
  title_en: string;
  title_ka: string;
  image_url: string | null;
  qty: number;
  unit_price: number;
  line_total: number;
  unit_price_cents: number;
  line_total_cents: number;
  options: Record<string, unknown> | null;
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
  product_type: string;
  product_translations: ProductTranslationRow[];
  product_variants: ProductVariantRow[];
  product_images: ProductImageRow[];
};

const asRecord = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError();
  }

  return value as Record<string, unknown>;
};

const asTrimmedString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asNumber = (value: unknown) => {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const normalizePhone = (value: string) => value.replace(/\D/g, "");

const toPublicImageUrl = (storagePath: string) =>
  getSupabasePublicReadClient().storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;

const pickTranslationTitle = (translations: ProductTranslationRow[], lang: "en" | "ka", fallback: string) =>
  translations.find((entry) => entry.lang === lang)?.title?.trim() ||
  translations.find((entry) => entry.lang === "en")?.title?.trim() ||
  translations.find((entry) => entry.lang === "ka")?.title?.trim() ||
  translations.find((entry) => entry.title?.trim())?.title?.trim() ||
  fallback;

const buildColorLabel = (variant: ProductVariantRow | undefined) =>
  variant?.background_name ?? variant?.variant_name ?? variant?.ornament_name ?? null;

const pickImageUrl = (images: ProductImageRow[], variantId: string) => {
  const variantImages = images.filter((image) => image.variant_id === variantId);
  const selected = pickPrimaryProductImage(variantImages.length > 0 ? variantImages : images);

  return selected ? toPublicImageUrl(selected.storage_path) : null;
};

const parseLookupPayload = (payload: unknown): ParsedLookupRequest => {
  const root = asRecord(payload);
  const code = asTrimmedString(root.code);
  const contact = asTrimmedString(root.contact) ?? asTrimmedString(root.email);

  if (!code || !contact) {
    throw new ValidationError();
  }

  return {
    code,
    contact,
  };
};

const badRequest = () =>
  NextResponse.json({ message: GENERIC_ERROR_MESSAGE }, { status: 400 });

const notFound = () =>
  NextResponse.json({ message: GENERIC_ERROR_MESSAGE }, { status: 404 });

const serverError = () =>
  NextResponse.json({ message: GENERIC_ERROR_MESSAGE }, { status: 500 });

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

export async function POST(request: NextRequest) {
  let parsed: ParsedLookupRequest;

  try {
    parsed = parseLookupPayload(await request.json());
  } catch {
    return badRequest();
  }

  console.info("[orders.lookup] request accepted", {
    hasCode: parsed.code.length > 0,
    contactLength: parsed.contact.length,
    lookupClientPath: "admin",
    imageUrlClientPath: "public",
    adminKeyEnv: supabaseEnvDiagnostics.chosenAdminKeyEnv,
  });

  const supabase = getSupabaseAdmin();
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, order_code, status, currency, address, customer_name, email, phone, note, total_amount, created_at",
    )
    .eq("order_code", parsed.code)
    .maybeSingle();

  if (orderError) {
    console.error("[orders.lookup] initial order lookup failed", {
      ...readSupabaseErrorDetails(orderError),
      clientPath: "admin",
      adminKeyEnv: supabaseEnvDiagnostics.chosenAdminKeyEnv,
    });
    return serverError();
  }

  if (!orderData) {
    return notFound();
  }

  const matchedOrder = orderData as OrderLookupRow;
  const normalizedContact = parsed.contact.trim();
  const lowerContact = normalizedContact.toLowerCase();
  const contactMatchesEmail = matchedOrder.email.toLowerCase() === lowerContact;
  const contactMatchesPhone =
    normalizePhone(normalizedContact).length > 0 &&
    normalizePhone(matchedOrder.phone) === normalizePhone(normalizedContact);

  if (!contactMatchesEmail && !contactMatchesPhone) {
    return notFound();
  }

  const userOrdersQuery = supabase
    .from("orders")
    .select(
      "id, order_code, status, currency, address, customer_name, email, phone, note, total_amount, created_at",
    )
    .order("created_at", { ascending: false });

  const { data: userOrdersData, error: userOrdersError } = contactMatchesEmail
    ? await userOrdersQuery.eq("email", matchedOrder.email.toLowerCase())
    : await userOrdersQuery.eq("phone", matchedOrder.phone);

  if (userOrdersError) {
    console.error("[orders.lookup] user orders lookup failed", {
      ...readSupabaseErrorDetails(userOrdersError),
      clientPath: "admin",
      adminKeyEnv: supabaseEnvDiagnostics.chosenAdminKeyEnv,
    });
    return serverError();
  }

  const orders = (userOrdersData ?? []) as OrderLookupRow[];
  if (orders.length === 0) {
    return notFound();
  }

  const orderIds = orders.map((order) => order.id);
  const { data: itemRows, error: itemError } = await supabase
    .from("order_items")
    .select("order_id, product_id, variant_id, qty, unit_price, line_total, snapshot_title, snapshot_variant")
    .in("order_id", orderIds);

  if (itemError) {
    console.error("[orders.lookup] order items lookup failed", {
      ...readSupabaseErrorDetails(itemError),
      clientPath: "admin",
      adminKeyEnv: supabaseEnvDiagnostics.chosenAdminKeyEnv,
    });
    return serverError();
  }

  const rawItems =
    ((itemRows ?? []) as Array<{
      order_id: string;
      product_id: string;
      variant_id: string;
      qty: number;
      unit_price: number | string;
      line_total: number | string;
      snapshot_title: string | null;
      snapshot_variant: string | null;
    }>) ?? [];

  const productIds = [...new Set(rawItems.map((item) => item.product_id))];
  const productMap = new Map<string, ProductRow>();

  if (productIds.length > 0) {
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select(
        "id, slug, product_type, product_translations(lang, title), product_variants(id, variant_name, background_name, ornament_name, size_label), product_images(variant_id, image_type, storage_path, sort_order)",
      )
      .in("id", productIds);

    if (productsError) {
      console.error("[orders.lookup] product enrichment failed", {
        ...readSupabaseErrorDetails(productsError),
        clientPath: "admin",
        adminKeyEnv: supabaseEnvDiagnostics.chosenAdminKeyEnv,
      });
      return serverError();
    }

    for (const product of (products ?? []) as ProductRow[]) {
      productMap.set(product.id, product);
    }
  }

  const enrichedItemsByOrder = rawItems.reduce<Record<string, OrderItemLookupRow[]>>((groups, item) => {
    const product = productMap.get(item.product_id);
    const variant = product?.product_variants.find((entry) => entry.id === item.variant_id);
    const fallbackTitle = item.snapshot_title ?? item.product_id;
    const titleEn = product
      ? pickTranslationTitle(product.product_translations ?? [], "en", fallbackTitle)
      : fallbackTitle;
    const titleKa = product
      ? pickTranslationTitle(product.product_translations ?? [], "ka", titleEn)
      : fallbackTitle;
    const unitPrice = asNumber(item.unit_price);
    const lineTotal = asNumber(item.line_total);

    const enrichedItem: OrderItemLookupRow = {
      product_id: item.product_id,
      variant_id: item.variant_id,
      product_slug: product?.slug ?? item.product_id,
      product_kind: product?.product_type ?? "unknown",
      title_en: titleEn,
      title_ka: titleKa,
      image_url: product ? pickImageUrl(product.product_images ?? [], item.variant_id) : null,
      qty: item.qty,
      unit_price: unitPrice,
      line_total: lineTotal,
      unit_price_cents: Math.round(unitPrice * 100),
      line_total_cents: Math.round(lineTotal * 100),
      options: {
        variant_id: item.variant_id,
        color_label: buildColorLabel(variant),
        background_label: variant?.background_name ?? null,
        size_label: variant?.size_label ?? item.snapshot_variant ?? null,
      },
    };
    groups[item.order_id] = [...(groups[item.order_id] ?? []), enrichedItem];
    return groups;
  }, {});

  return NextResponse.json({
    orders: orders.map((order) => {
      const enrichedItems = enrichedItemsByOrder[order.id] ?? [];
      const subtotalCents = enrichedItems.reduce((sum, item) => sum + item.line_total_cents, 0);
      const totalCents = Math.round(asNumber(order.total_amount) * 100);

      return {
        code: order.order_code,
        status: order.status,
        currency: order.currency,
        address: order.address,
        customer_name: order.customer_name,
        customer_email: order.email,
        customer_phone: order.phone,
        customer_note: order.note,
        subtotal_cents: subtotalCents,
        total_cents: totalCents,
        created_at: order.created_at,
        items: enrichedItems,
      };
    }),
  });
}
