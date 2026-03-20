import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicReadClient } from "@/src/lib/supabasePublic";

export const runtime = "nodejs";

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
    return NextResponse.json({ message: "Invalid cart payload." }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json({
      validItems: [],
      invalidRemovedCount: 0,
    });
  }

  const productIds = [...new Set(items.map((item) => item.productId))];
  const supabase = getSupabasePublicReadClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, product_variants(id)")
    .in("id", productIds)
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ message: "Unable to validate cart." }, { status: 500 });
  }

  const validProductMap = new Map(
    (data ?? []).map((product) => [
      product.id,
      {
        slug: product.slug,
        variantIds: new Set((product.product_variants ?? []).map((variant) => variant.id)),
      },
    ]),
  );

  const validItems = (payload as { items: unknown[] }).items.filter((entry): boolean => {
    const item = asRecord(entry);
    if (!item) {
      return false;
    }

    const productId = asTrimmedString(item.productId);
    const slug = asTrimmedString(item.slug);
    const variantId = asTrimmedString(item.variantId);
    if (!productId || !slug || !variantId) {
      return false;
    }

    const product = validProductMap.get(productId);
    return Boolean(product && product.slug === slug && product.variantIds.has(variantId));
  });

  return NextResponse.json({
    validItems,
    invalidRemovedCount: Math.max(0, items.length - validItems.length),
  });
}
