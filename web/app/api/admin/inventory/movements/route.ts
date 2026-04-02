import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionCookieName, resolveSafeAdminRedirectPath, verifyAdminSessionToken } from "@/src/lib/adminSession";
import { isInventoryMovementType } from "@/src/lib/inventoryAdmin";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";

export const runtime = "nodejs";

type InventoryItemLookupRow = {
  id: string;
  default_unit_cost: number | null;
};

type InventoryPositionLookupRow = {
  qty_on_hand: number | null;
};

const redirectWithState = ({
  request,
  returnTo,
  result,
}: {
  request: NextRequest;
  returnTo: string;
  result:
    | "inventory_movement_created"
    | "invalid_inventory_movement"
    | "insufficient_inventory"
    | "unauthorized"
    | "temporary_error";
}) => {
  const url = new URL(resolveSafeAdminRedirectPath(returnTo), request.url);
  url.searchParams.set("result", result);
  return NextResponse.redirect(url);
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
    const inventoryItemId = String(formData.get("inventoryItemId") ?? "").trim();
    const movementType = String(formData.get("movementType") ?? "").trim();
    const movementDate = String(formData.get("movementDate") ?? "").trim();
    const qtyRaw = Number(String(formData.get("qty") ?? ""));
    const totalValueRaw = String(formData.get("totalValue") ?? "").trim();
    const vendorRaw = String(formData.get("vendor") ?? "").trim();
    const notesRaw = String(formData.get("notes") ?? "").trim();
    const returnTo = String(formData.get("returnTo") ?? "/admin/inventory");

    if (
      !inventoryItemId ||
      !isInventoryMovementType(movementType) ||
      !movementDate ||
      !Number.isFinite(qtyRaw) ||
      qtyRaw <= 0
    ) {
      return redirectWithState({
        request,
        returnTo,
        result: "invalid_inventory_movement",
      });
    }

    const supabase = getSupabaseAdmin();
    const [{ data: inventoryItem, error: itemError }, { data: positionRow, error: positionError }] = await Promise.all([
      supabase
        .from("inventory_items")
        .select("id, default_unit_cost")
        .eq("id", inventoryItemId)
        .maybeSingle(),
      supabase
        .from("reporting_inventory_position_v1")
        .select("qty_on_hand")
        .eq("inventory_item_id", inventoryItemId)
        .maybeSingle(),
    ]);

    if (itemError || positionError || !inventoryItem) {
      console.error("[admin.inventory.movements] lookup failed", {
        itemMessage: itemError?.message,
        positionMessage: positionError?.message,
      });
      return redirectWithState({
        request,
        returnTo,
        result: "temporary_error",
      });
    }

    const item = inventoryItem as InventoryItemLookupRow;
    const currentQty = ((positionRow as InventoryPositionLookupRow | null)?.qty_on_hand ?? 0);
    const providedTotalValue =
      totalValueRaw.length > 0 ? Number(totalValueRaw) : null;
    const fallbackTotalValue =
      item.default_unit_cost != null ? item.default_unit_cost * qtyRaw : null;
    const absoluteValue =
      providedTotalValue != null && Number.isFinite(providedTotalValue)
        ? providedTotalValue
        : fallbackTotalValue;

    if (absoluteValue == null || !Number.isFinite(absoluteValue) || absoluteValue < 0) {
      return redirectWithState({
        request,
        returnTo,
        result: "invalid_inventory_movement",
      });
    }

    const isPositiveMovement =
      movementType === "purchase" || movementType === "adjustment_in";

    if (!isPositiveMovement && qtyRaw > currentQty) {
      return redirectWithState({
        request,
        returnTo,
        result: "insufficient_inventory",
      });
    }

    const qtyDelta = isPositiveMovement ? qtyRaw : -qtyRaw;
    const valueDelta = isPositiveMovement ? absoluteValue : -absoluteValue;

    const { error } = await supabase.from("inventory_movements").insert({
      inventory_item_id: inventoryItemId,
      movement_type: movementType,
      movement_date: movementDate,
      qty_delta: qtyDelta,
      value_delta: valueDelta,
      currency: "GEL",
      vendor: vendorRaw.length > 0 ? vendorRaw : null,
      notes: notesRaw.length > 0 ? notesRaw : null,
    });

    if (error) {
      console.error("[admin.inventory.movements] insert failed", {
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
      result: "inventory_movement_created",
    });
  } catch (error) {
    console.error("[admin.inventory.movements] unexpected failure", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return redirectWithState({
      request,
      returnTo: "/admin/inventory",
      result: "temporary_error",
    });
  }
}
