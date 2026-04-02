import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionCookieName, resolveSafeAdminRedirectPath, verifyAdminSessionToken } from "@/src/lib/adminSession";
import { isInventoryProductType, normalizeInventoryCode } from "@/src/lib/inventoryAdmin";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";

export const runtime = "nodejs";

const redirectWithState = ({
  request,
  returnTo,
  result,
}: {
  request: NextRequest;
  returnTo: string;
  result:
    | "inventory_stock_added"
    | "invalid_inventory_item"
    | "unauthorized"
    | "temporary_error";
}) => {
  const url = new URL(resolveSafeAdminRedirectPath(returnTo), request.url);
  url.searchParams.set("result", result);
  return NextResponse.redirect(url);
};

const pickTranslationTitle = (
  translations: Array<{ lang: string | null; title: string | null }> | null | undefined,
  lang: string,
  fallback: string,
) => {
  const directMatch = translations?.find((entry) => entry.lang === lang)?.title?.trim();
  if (directMatch) {
    return directMatch;
  }

  const anyTitle = translations?.find((entry) => entry.title?.trim())?.title?.trim();
  return anyTitle || fallback;
};

const parseStockProductKey = (value: string) => {
  const [productId, encodedSizeLabel = ""] = value.split("::");
  return {
    productId: productId?.trim() ?? "",
    sizeLabel: encodedSizeLabel ? decodeURIComponent(encodedSizeLabel) : "",
  };
};

const resolveDefaultUnitCost = async ({
  supabase,
  productId,
  productType,
  sizeLabel,
}: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  productId: string;
  productType: string | null;
  sizeLabel: string;
}) => {
  const { data, error } = await supabase
    .from("product_cost_rules")
    .select("product_id, product_type, size_label, unit_cost, effective_from, effective_to, created_at")
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  const today = new Date().toISOString().slice(0, 10);
  const normalizedSize = sizeLabel.trim().toLowerCase();
  const rules = (data ?? []).filter((rule) => {
    const matchesProduct =
      rule.product_id === productId ||
      (rule.product_id == null && productType != null && rule.product_type === productType);
    if (!matchesProduct) {
      return false;
    }

    if (rule.effective_from && rule.effective_from > today) {
      return false;
    }

    if (rule.effective_to && rule.effective_to < today) {
      return false;
    }

    if (rule.size_label == null || rule.size_label.trim().length === 0) {
      return true;
    }

    return rule.size_label.trim().toLowerCase() === normalizedSize;
  });

  if (rules.length === 0) {
    return null;
  }

  rules.sort((left, right) => {
    const leftScore = Number(left.product_id != null) + Number(left.size_label != null);
    const rightScore = Number(right.product_id != null) + Number(right.size_label != null);
    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    const effectiveCompare = String(right.effective_from ?? "").localeCompare(String(left.effective_from ?? ""));
    if (effectiveCompare !== 0) {
      return effectiveCompare;
    }

    return String(right.created_at ?? "").localeCompare(String(left.created_at ?? ""));
  });

  return rules[0]?.unit_cost ?? null;
};

export async function POST(request: NextRequest) {
  const hasSession = await verifyAdminSessionToken(
    request.cookies.get(getAdminSessionCookieName())?.value,
  );

  if (!hasSession) {
    return redirectWithState({
      request,
      returnTo: "/admin/inventory",
      result: "unauthorized",
    });
  }

  try {
    const formData = await request.formData();
    const stockProductKey = String(formData.get("stockProductKey") ?? "").trim();
    const movementDate = String(formData.get("movementDate") ?? "").trim();
    const qtyRaw = Number(String(formData.get("qty") ?? ""));
    const totalValueRaw = String(formData.get("totalValue") ?? "").trim();
    const vendorRaw = String(formData.get("vendor") ?? "").trim();
    const notesRaw = String(formData.get("notes") ?? "").trim();
    const returnTo = String(formData.get("returnTo") ?? "/admin/inventory");

    if (!stockProductKey || !movementDate || !Number.isFinite(qtyRaw) || qtyRaw <= 0) {
      return redirectWithState({
        request,
        returnTo,
        result: "invalid_inventory_item",
      });
    }

    const supabase = getSupabaseAdmin();
    const { productId, sizeLabel } = parseStockProductKey(stockProductKey);
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, slug, product_type, product_translations(lang, title)")
      .eq("id", productId)
      .eq("is_active", true)
      .maybeSingle();

    if (productError || !product) {
      return redirectWithState({
        request,
        returnTo,
        result: "invalid_inventory_item",
      });
    }

    const resolvedName = pickTranslationTitle(
      (
        product.product_translations as Array<{ lang: string | null; title: string | null }> | null | undefined
      ),
      "en",
      product.slug,
    );
    const resolvedCode = normalizeInventoryCode(
      sizeLabel.length > 0 ? `${product.slug}_${sizeLabel}_stock` : `${product.slug}_stock`,
    );
    const resolvedProductType = product.product_type;
    const resolvedSizeLabel = sizeLabel.length > 0 ? sizeLabel : null;
    const resolvedDefaultUnitCost = await resolveDefaultUnitCost({
      supabase,
      productId: product.id,
      productType: product.product_type,
      sizeLabel,
    });
    const providedTotalValue =
      totalValueRaw.length > 0 ? Number(totalValueRaw) : null;
    const resolvedTotalValue =
      providedTotalValue != null && Number.isFinite(providedTotalValue)
        ? providedTotalValue
        : resolvedDefaultUnitCost != null
          ? resolvedDefaultUnitCost * qtyRaw
          : null;

    if (
      !resolvedCode ||
      !resolvedName ||
      (resolvedProductType !== null && !isInventoryProductType(resolvedProductType)) ||
      (resolvedDefaultUnitCost !== null && (!Number.isFinite(resolvedDefaultUnitCost) || resolvedDefaultUnitCost < 0)) ||
      resolvedTotalValue == null ||
      !Number.isFinite(resolvedTotalValue) ||
      resolvedTotalValue < 0
    ) {
      return redirectWithState({
        request,
        returnTo,
        result: "invalid_inventory_item",
      });
    }

    const { data: existingItem, error: existingItemError } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("code", resolvedCode)
      .maybeSingle();

    if (existingItemError) {
      console.error("[admin.inventory.items] existing item lookup failed", {
        message: existingItemError.message,
      });
      return redirectWithState({
        request,
        returnTo,
        result: "temporary_error",
      });
    }

    let inventoryItemId = existingItem?.id ?? null;

    if (!inventoryItemId) {
      const { data: insertedItem, error: insertItemError } = await supabase
        .from("inventory_items")
        .insert({
          code: resolvedCode,
          name: resolvedName,
          item_kind: "sellable",
          unit: "pcs",
          product_type: resolvedProductType,
          size_label: resolvedSizeLabel,
          packaging_catalog_id: null,
          default_unit_cost: resolvedDefaultUnitCost,
          currency: "GEL",
          notes: notesRaw.length > 0 ? notesRaw : null,
        })
        .select("id")
        .single();

      if (insertItemError || !insertedItem) {
        console.error("[admin.inventory.items] item insert failed", {
          message: insertItemError?.message,
        });
        return redirectWithState({
          request,
          returnTo,
          result: "temporary_error",
        });
      }

      inventoryItemId = insertedItem.id;
    }

    const { error: movementError } = await supabase.from("inventory_movements").insert({
      inventory_item_id: inventoryItemId,
      movement_type: "purchase",
      movement_date: movementDate,
      qty_delta: qtyRaw,
      value_delta: resolvedTotalValue,
      currency: "GEL",
      vendor: vendorRaw.length > 0 ? vendorRaw : null,
      notes: notesRaw.length > 0 ? notesRaw : null,
    });

    if (movementError) {
      console.error("[admin.inventory.items] stock movement insert failed", {
        message: movementError.message,
      });
      return redirectWithState({
        request,
        returnTo,
        result: "temporary_error",
      });
    }

    return redirectWithState({
      request,
      returnTo,
      result: "inventory_stock_added",
    });
  } catch (error) {
    console.error("[admin.inventory.items] unexpected failure", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return redirectWithState({
      request,
      returnTo: "/admin/inventory",
      result: "temporary_error",
    });
  }
}
