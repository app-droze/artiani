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
    const unitRaw = String(formData.get("unit") ?? "").trim();
    const unit = unitRaw.length > 0 ? unitRaw : "pcs";
    const productTypeRaw = String(formData.get("productType") ?? "").trim();
    const sizeLabelRaw = String(formData.get("sizeLabel") ?? "").trim();
    const defaultUnitCostRaw = String(formData.get("defaultUnitCost") ?? "").trim();
    const notesRaw = String(formData.get("notes") ?? "").trim();
    const returnTo = String(formData.get("returnTo") ?? "/admin/inventory");

    const defaultUnitCost =
      defaultUnitCostRaw.length > 0 ? Number(defaultUnitCostRaw) : null;

    if (
      !code ||
      !name ||
      !isInventoryItemKind(itemKind) ||
      !unit ||
      (productTypeRaw.length > 0 && !isInventoryProductType(productTypeRaw)) ||
      (defaultUnitCost !== null && (!Number.isFinite(defaultUnitCost) || defaultUnitCost < 0))
    ) {
      return redirectWithState({
        request,
        returnTo,
        result: "invalid_inventory_item",
      });
    }

    const { error } = await getSupabaseAdmin().from("inventory_items").insert({
      code,
      name,
      item_kind: itemKind,
      unit,
      product_type: productTypeRaw.length > 0 ? productTypeRaw : null,
      size_label: sizeLabelRaw.length > 0 ? sizeLabelRaw : null,
      default_unit_cost: defaultUnitCost,
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
