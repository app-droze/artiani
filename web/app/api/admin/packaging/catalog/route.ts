import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionCookieName, resolveSafeAdminRedirectPath, verifyAdminSessionToken } from "@/src/lib/adminSession";
import { isInventoryItemKind, normalizeInventoryCode } from "@/src/lib/inventoryAdmin";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";

export const runtime = "nodejs";

const redirectWithState = ({
  request,
  returnTo,
  result,
}: {
  request: NextRequest;
  returnTo: string;
  result: "packaging_created" | "invalid_fulfillment" | "duplicate_packaging" | "unauthorized" | "temporary_error";
}) => {
  const url = new URL(resolveSafeAdminRedirectPath(returnTo), request.url);
  url.searchParams.set("result", result);
  return NextResponse.redirect(url);
};

const isUniqueViolation = (error: unknown) =>
  Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "23505");

const normalizeCatalogItemKind = (value: string) => {
  if (!isInventoryItemKind(value)) {
    return null;
  }

  return value === "packaging" || value === "gift" ? value : null;
};

export async function POST(request: NextRequest) {
  const hasSession = await verifyAdminSessionToken(
    request.cookies.get(getAdminSessionCookieName())?.value,
  );

  if (!hasSession) {
    return redirectWithState({
      request,
      returnTo: "/admin/fulfillment",
      result: "unauthorized",
    });
  }

  try {
    const formData = await request.formData();
    const code = normalizeInventoryCode(String(formData.get("code") ?? ""));
    const name = String(formData.get("name") ?? "").trim();
    const itemKind = normalizeCatalogItemKind(String(formData.get("itemKind") ?? ""));
    const unitCostRaw = String(formData.get("unitCost") ?? "").trim();
    const unitCost = unitCostRaw.length > 0 ? Number(unitCostRaw) : 0;
    const notesRaw = String(formData.get("notes") ?? "").trim();
    const notes = notesRaw.length > 0 ? notesRaw : null;
    const returnTo = String(formData.get("returnTo") ?? "/admin/fulfillment");

    if (!code || !name || !itemKind || !Number.isFinite(unitCost) || unitCost < 0) {
      return redirectWithState({
        request,
        returnTo,
        result: "invalid_fulfillment",
      });
    }

    const supabase = getSupabaseAdmin();
    const { data: packaging, error } = await supabase
      .from("packaging_catalog")
      .insert({
        code,
        name,
        item_kind: itemKind,
        unit_cost: unitCost,
        currency: "GEL",
        notes,
      })
      .select("id, code, name, item_kind, unit_cost, currency, notes")
      .single();

    if (error) {
      if (isUniqueViolation(error)) {
        return redirectWithState({
          request,
          returnTo,
          result: "duplicate_packaging",
        });
      }

      console.error("[admin.packaging.catalog] insert failed", {
        message: error.message,
      });
      return redirectWithState({
        request,
        returnTo,
        result: "temporary_error",
      });
    }

    const inventoryCode = `${code}_${itemKind}`;
    const { error: inventoryError } = await supabase.from("inventory_items").upsert(
      {
        code: inventoryCode,
        name,
        item_kind: itemKind,
        unit: "pcs",
        packaging_catalog_id: packaging.id,
        default_unit_cost: packaging.unit_cost,
        currency: packaging.currency,
        notes: packaging.notes,
      },
      {
        onConflict: "code",
      },
    );

    if (inventoryError) {
      console.error("[admin.packaging.catalog] inventory mirror failed", {
        message: inventoryError.message,
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
      result: "packaging_created",
    });
  } catch (error) {
    console.error("[admin.packaging.catalog] unexpected failure", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return redirectWithState({
      request,
      returnTo: "/admin/fulfillment",
      result: "temporary_error",
    });
  }
}
