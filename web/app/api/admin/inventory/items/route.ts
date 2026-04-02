import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionCookieName, resolveSafeAdminRedirectPath, verifyAdminSessionToken } from "@/src/lib/adminSession";
import { isInventoryItemKind, isInventoryProductType, normalizeInventoryCode } from "@/src/lib/inventoryAdmin";
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

const buildPackagingInventoryCode = ({
  code,
  itemKind,
}: {
  code: string;
  itemKind: "packaging" | "gift";
}) => normalizeInventoryCode(`${code}_${itemKind}`);

const resolveDefaultUnitCost = async ({
  supabase,
  productId,
  productType,
  sizeLabel,
  effectiveDate,
}: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  productId: string;
  productType: string | null;
  sizeLabel: string;
  effectiveDate: string;
}) => {
  const { data, error } = await supabase
    .from("product_cost_rules")
    .select("product_id, product_type, size_label, unit_cost, effective_from, effective_to, created_at")
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  const ruleDate = effectiveDate;
  const normalizedSize = sizeLabel.trim().toLowerCase();
  const rules = (data ?? []).filter((rule) => {
    const matchesProduct =
      rule.product_id === productId ||
      (rule.product_id == null && productType != null && rule.product_type === productType);
    if (!matchesProduct) {
      return false;
    }

    if (rule.effective_from && rule.effective_from > ruleDate) {
      return false;
    }

    if (rule.effective_to && rule.effective_to < ruleDate) {
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

const calculateWeightedUnitCost = ({
  currentQty,
  currentStockValue,
  addedQty,
  addedValue,
}: {
  currentQty: number;
  currentStockValue: number;
  addedQty: number;
  addedValue: number;
}) => {
  const totalQty = currentQty + addedQty;
  if (totalQty <= 0) {
    return null;
  }

  return Number(((currentStockValue + addedValue) / totalQty).toFixed(2));
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
    const stockSourceType = String(formData.get("stockSourceType") ?? "product").trim();
    const stockProductKey = String(formData.get("stockProductKey") ?? "").trim();
    const packagingCatalogId = String(formData.get("packagingCatalogId") ?? "").trim();
    const movementDate = String(formData.get("movementDate") ?? "").trim();
    const qtyRaw = Number(String(formData.get("qty") ?? ""));
    const totalPaidRaw = String(formData.get("totalPaid") ?? "").trim();
    const vendorRaw = String(formData.get("vendor") ?? "").trim();
    const notesRaw = String(formData.get("notes") ?? "").trim();
    const returnTo = String(formData.get("returnTo") ?? "/admin/inventory");
    const totalPaid =
      totalPaidRaw.length > 0 ? Number(totalPaidRaw) : null;

    if (!movementDate || !Number.isFinite(qtyRaw) || qtyRaw <= 0) {
      return redirectWithState({
        request,
        returnTo,
        result: "invalid_inventory_item",
      });
    }

    const supabase = getSupabaseAdmin();
    let resolvedCode = "";
    let resolvedName = "";
    let resolvedItemKind: "sellable" | "packaging" | "gift" = "sellable";
    let resolvedProductId: string | null = null;
    let resolvedProductType: string | null = null;
    let resolvedSizeLabel: string | null = null;
    let resolvedPackagingCatalogId: string | null = null;
    let resolvedDefaultUnitCost: number | null = null;
    let resolvedTotalValue: number | null = null;

    if (stockSourceType === "product") {
      if (!stockProductKey) {
        return redirectWithState({
          request,
          returnTo,
          result: "invalid_inventory_item",
        });
      }

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

      resolvedName = pickTranslationTitle(
        (
          product.product_translations as Array<{ lang: string | null; title: string | null }> | null | undefined
        ),
        "en",
        product.slug,
      );
      resolvedCode = normalizeInventoryCode(
        sizeLabel.length > 0 ? `${product.slug}_${sizeLabel}_stock` : `${product.slug}_stock`,
      );
      resolvedItemKind = "sellable";
      resolvedProductId = product.id;
      resolvedProductType = product.product_type;
      resolvedSizeLabel = sizeLabel.length > 0 ? sizeLabel : null;
      resolvedPackagingCatalogId = null;
      resolvedDefaultUnitCost = await resolveDefaultUnitCost({
        supabase,
        productId: product.id,
        productType: product.product_type,
        sizeLabel,
        effectiveDate: movementDate,
      });
      resolvedTotalValue =
        resolvedDefaultUnitCost != null ? resolvedDefaultUnitCost * qtyRaw : null;
    } else if (stockSourceType === "packaging") {
      if (!packagingCatalogId || totalPaid == null || !Number.isFinite(totalPaid) || totalPaid < 0) {
        return redirectWithState({
          request,
          returnTo,
          result: "invalid_inventory_item",
        });
      }

      const { data: catalogItem, error: catalogItemError } = await supabase
        .from("packaging_catalog")
        .select("id, code, name, item_kind, unit_cost, currency, notes, is_active")
        .eq("id", packagingCatalogId)
        .eq("is_active", true)
        .maybeSingle();

      if (catalogItemError || !catalogItem) {
        return redirectWithState({
          request,
          returnTo,
          result: "invalid_inventory_item",
        });
      }

      if (!isInventoryItemKind(catalogItem.item_kind) || catalogItem.item_kind === "sellable") {
        return redirectWithState({
          request,
          returnTo,
          result: "invalid_inventory_item",
        });
      }

      resolvedCode = buildPackagingInventoryCode({
        code: catalogItem.code,
        itemKind: catalogItem.item_kind,
      });
      resolvedName = catalogItem.name;
      resolvedItemKind = catalogItem.item_kind;
      resolvedProductId = null;
      resolvedProductType = null;
      resolvedSizeLabel = null;
      resolvedPackagingCatalogId = catalogItem.id;
      resolvedDefaultUnitCost = qtyRaw > 0 ? totalPaid / qtyRaw : catalogItem.unit_cost;
      resolvedTotalValue = totalPaid;
    } else {
      return redirectWithState({
        request,
        returnTo,
        result: "invalid_inventory_item",
      });
    }

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
    let currentQtyOnHand = 0;
    let currentStockValueAmount = 0;

    if (inventoryItemId) {
      const { data: currentPosition, error: currentPositionError } = await supabase
        .from("reporting_inventory_position_v1")
        .select("qty_on_hand, stock_value_amount")
        .eq("inventory_item_id", inventoryItemId)
        .maybeSingle();

      if (currentPositionError) {
        console.error("[admin.inventory.items] current position lookup failed", {
          message: currentPositionError.message,
        });
        return redirectWithState({
          request,
          returnTo,
          result: "temporary_error",
        });
      }

      currentQtyOnHand = Number(currentPosition?.qty_on_hand ?? 0) || 0;
      currentStockValueAmount = Number(currentPosition?.stock_value_amount ?? 0) || 0;
    }

    const nextDefaultUnitCost = calculateWeightedUnitCost({
      currentQty: currentQtyOnHand,
      currentStockValue: currentStockValueAmount,
      addedQty: qtyRaw,
      addedValue: resolvedTotalValue,
    });

    if (!inventoryItemId) {
      const { data: insertedItem, error: insertItemError } = await supabase
        .from("inventory_items")
        .insert({
          code: resolvedCode,
          name: resolvedName,
          item_kind: resolvedItemKind,
          unit: "pcs",
          product_id: resolvedProductId,
          product_type: resolvedProductType,
          size_label: resolvedSizeLabel,
          packaging_catalog_id: resolvedPackagingCatalogId,
          default_unit_cost: nextDefaultUnitCost,
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
    } else {
      const { error: updateExistingError } = await supabase
        .from("inventory_items")
        .update({
          name: resolvedName,
          item_kind: resolvedItemKind,
          product_id: resolvedProductId,
          product_type: resolvedProductType,
          size_label: resolvedSizeLabel,
          packaging_catalog_id: resolvedPackagingCatalogId,
          default_unit_cost: nextDefaultUnitCost,
          currency: "GEL",
        })
        .eq("id", inventoryItemId);

      if (updateExistingError) {
        console.error("[admin.inventory.items] existing item update failed", {
          message: updateExistingError.message,
        });
        return redirectWithState({
          request,
          returnTo,
          result: "temporary_error",
        });
      }
    }

    if (stockSourceType === "packaging" && resolvedPackagingCatalogId && nextDefaultUnitCost != null) {
      const { error: updateCatalogError } = await supabase
        .from("packaging_catalog")
        .update({
          unit_cost: nextDefaultUnitCost,
        })
        .eq("id", resolvedPackagingCatalogId);

      if (updateCatalogError) {
        console.error("[admin.inventory.items] packaging catalog cost update failed", {
          message: updateCatalogError.message,
        });
        return redirectWithState({
          request,
          returnTo,
          result: "temporary_error",
        });
      }
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
