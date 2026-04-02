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
    | "inventory_item_created"
    | "invalid_inventory_item"
    | "duplicate_inventory_item"
    | "unauthorized"
    | "temporary_error";
}) => {
  const url = new URL(resolveSafeAdminRedirectPath(returnTo), request.url);
  url.searchParams.set("result", result);
  return NextResponse.redirect(url);
};

const isUniqueViolation = (error: unknown) =>
  Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "23505");

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
    const code = normalizeInventoryCode(String(formData.get("code") ?? ""));
    const name = String(formData.get("name") ?? "").trim();
    const itemKind = String(formData.get("itemKind") ?? "").trim();
    const catalogueProductId = String(formData.get("catalogueProductId") ?? "").trim();
    const packagingCatalogId = String(formData.get("packagingCatalogId") ?? "").trim();
    const unitRaw = String(formData.get("unit") ?? "").trim();
    const unit = unitRaw.length > 0 ? unitRaw : "pcs";
    const productTypeRaw = String(formData.get("productType") ?? "").trim();
    const sizeLabelRaw = String(formData.get("sizeLabel") ?? "").trim();
    const defaultUnitCostRaw = String(formData.get("defaultUnitCost") ?? "").trim();
    const notesRaw = String(formData.get("notes") ?? "").trim();
    const returnTo = String(formData.get("returnTo") ?? "/admin/inventory");

    const defaultUnitCost =
      defaultUnitCostRaw.length > 0 ? Number(defaultUnitCostRaw) : null;

    if (catalogueProductId && packagingCatalogId) {
      return redirectWithState({
        request,
        returnTo,
        result: "invalid_inventory_item",
      });
    }

    const supabase = getSupabaseAdmin();
    let resolvedCode = code;
    let resolvedName = name;
    let resolvedItemKind = itemKind;
    let resolvedProductType = productTypeRaw.length > 0 ? productTypeRaw : null;
    let resolvedPackagingCatalogId: string | null = null;
    let resolvedDefaultUnitCost = defaultUnitCost;

    if (catalogueProductId) {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id, slug, product_type, product_translations(lang, title)")
        .eq("id", catalogueProductId)
        .eq("is_active", true)
        .maybeSingle();

      if (productError || !product) {
        return redirectWithState({
          request,
          returnTo,
          result: "invalid_inventory_item",
        });
      }

      const fallbackName = pickTranslationTitle(
        (
          product.product_translations as Array<{ lang: string | null; title: string | null }> | null | undefined
        ),
        "en",
        product.slug,
      );

      resolvedCode = resolvedCode || normalizeInventoryCode(
        sizeLabelRaw.length > 0 ? `${product.slug}_${sizeLabelRaw}` : product.slug,
      );
      resolvedName = resolvedName || fallbackName;
      resolvedItemKind = "sellable";
      resolvedProductType = product.product_type;
      resolvedPackagingCatalogId = null;
    } else if (packagingCatalogId) {
      const { data: packaging, error: packagingError } = await supabase
        .from("packaging_catalog")
        .select("id, code, name, unit_cost")
        .eq("id", packagingCatalogId)
        .eq("is_active", true)
        .maybeSingle();

      if (packagingError || !packaging) {
        return redirectWithState({
          request,
          returnTo,
          result: "invalid_inventory_item",
        });
      }

      resolvedCode = resolvedCode || normalizeInventoryCode(`${packaging.code}_packaging`);
      resolvedName = resolvedName || packaging.name;
      resolvedItemKind = "packaging";
      resolvedProductType = null;
      resolvedPackagingCatalogId = packaging.id;
      resolvedDefaultUnitCost = resolvedDefaultUnitCost ?? packaging.unit_cost;
    }

    if (
      !resolvedCode ||
      !resolvedName ||
      !isInventoryItemKind(resolvedItemKind) ||
      !unit ||
      (resolvedProductType !== null && !isInventoryProductType(resolvedProductType)) ||
      (resolvedDefaultUnitCost !== null && (!Number.isFinite(resolvedDefaultUnitCost) || resolvedDefaultUnitCost < 0))
    ) {
      return redirectWithState({
        request,
        returnTo,
        result: "invalid_inventory_item",
      });
    }

    const { error } = await supabase.from("inventory_items").insert({
      code: resolvedCode,
      name: resolvedName,
      item_kind: resolvedItemKind,
      unit,
      product_type: resolvedProductType,
      size_label: sizeLabelRaw.length > 0 ? sizeLabelRaw : null,
      packaging_catalog_id: resolvedPackagingCatalogId,
      default_unit_cost: resolvedDefaultUnitCost,
      currency: "GEL",
      notes: notesRaw.length > 0 ? notesRaw : null,
    });

    if (error) {
      if (isUniqueViolation(error)) {
        return redirectWithState({
          request,
          returnTo,
          result: "duplicate_inventory_item",
        });
      }

      console.error("[admin.inventory.items] insert failed", {
        message: error.message,
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
      result: "inventory_item_created",
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
