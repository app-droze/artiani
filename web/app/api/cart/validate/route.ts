import { NextRequest, NextResponse } from "next/server";
import { isSoldPaintingVariant } from "@/src/lib/catalogueModels";
import { getPhoneCaseModelMap } from "@/src/lib/phoneCaseModels";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";

export const runtime = "nodejs";

const AUCTION_ONLY_STATUSES = ["scheduled", "live", "winner_pending_payment"] as const;

type CartItemPayload = {
  key: string;
  productId: string;
  slug: string;
  variantId: string;
};

const asRecord = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const asTrimmedString = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseCartItems = (payload: unknown) => {
  const root = asRecord(payload);
  if (!root || !Array.isArray(root.items)) {
    return null;
  }

  const items: CartItemPayload[] = [];

  for (const entry of root.items) {
    const item = asRecord(entry);
    if (!item) {
      return null;
    }

    const key = asTrimmedString(item.key);
    const productId = asTrimmedString(item.productId);
    const slug = asTrimmedString(item.slug);
    const variantId = asTrimmedString(item.variantId);

    if (!key || !productId || !slug || !variantId) {
      return null;
    }

    items.push({
      key,
      productId,
      slug,
      variantId,
    });
  }

  return items;
};

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const items = parseCartItems(payload);

  if (!items) {
    const payloadItemCount =
      payload &&
      typeof payload === "object" &&
      "items" in payload &&
      Array.isArray((payload as { items?: unknown }).items)
        ? (payload as { items: unknown[] }).items.length
        : null;

    console.warn("[cart.validate] invalid payload", {
      hasPayload: payload !== null,
      payloadItemCount,
    });
    return NextResponse.json({ message: "Invalid cart payload." }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json({
      validItems: [],
      invalidRemovedCount: 0,
    });
  }

  const productIds = [...new Set(items.map((item) => item.productId))];
  const supabase = getSupabaseAdmin();
  const [{ data, error }, { data: auctionRows, error: auctionError }] = await Promise.all([
    supabase
      .from("products")
      .select("id, slug, product_type, product_variants(id, stock_status)")
      .in("id", productIds)
      .eq("is_active", true),
    supabase
      .from("auction_events")
      .select("product_id")
      .in("product_id", productIds)
      .in("status", [...AUCTION_ONLY_STATUSES]),
  ]);

  if (error || auctionError) {
    const failure = error ?? auctionError;
    console.error("[cart.validate] product validation query failed", {
      code: failure?.code ?? null,
      message: failure?.message ?? "Unknown Supabase error",
      details: failure?.details ?? null,
      hint: failure?.hint ?? null,
      itemCount: items.length,
      productCount: productIds.length,
    });
    return NextResponse.json({ message: "Unable to validate cart." }, { status: 500 });
  }

  const validProductMap = new Map(
    (data ?? []).map((product) => [
      product.id,
      {
        slug: product.slug,
        productType: product.product_type,
        variants: new Map(
          (product.product_variants ?? []).map((variant) => [variant.id, variant.stock_status ?? null]),
        ),
      },
    ]),
  );
  const auctionOnlyProductIds = new Set((auctionRows ?? []).map((row) => row.product_id));
  const phoneCaseModelMap = await getPhoneCaseModelMap();

  const validItems = (payload as { items: unknown[] }).items.filter((entry): boolean => {
    const item = asRecord(entry);
    if (!item) {
      return false;
    }

    const productId = asTrimmedString(item.productId);
    const slug = asTrimmedString(item.slug);
    const variantId = asTrimmedString(item.variantId);
    const selectedPhoneModelCode = asTrimmedString(item.selectedPhoneModelCode);
    if (!productId || !slug || !variantId) {
      return false;
    }

    const product = validProductMap.get(productId);
    const stockStatus = product?.variants.get(variantId);

    return Boolean(
      product &&
        product.slug === slug &&
        !auctionOnlyProductIds.has(productId) &&
        product.variants.has(variantId) &&
        (product.productType !== "phone_case" || Boolean(selectedPhoneModelCode && phoneCaseModelMap.has(selectedPhoneModelCode))) &&
        !isSoldPaintingVariant({
          productType: product.productType,
          stockStatus,
        }),
    );
  });

  return NextResponse.json({
    validItems,
    invalidRemovedCount: Math.max(0, items.length - validItems.length),
  });
}
