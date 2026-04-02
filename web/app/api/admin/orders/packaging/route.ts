import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionCookieName, resolveSafeAdminRedirectPath, verifyAdminSessionToken } from "@/src/lib/adminSession";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";

export const runtime = "nodejs";

const redirectWithState = ({
  request,
  returnTo,
  result,
}: {
  request: NextRequest;
  returnTo: string;
  result: "packaging_added" | "invalid_fulfillment" | "invalid_order" | "unauthorized" | "temporary_error";
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
      returnTo: "/admin/orders",
      result: "unauthorized",
    });
  }

  try {
    const formData = await request.formData();
    const orderId = String(formData.get("orderId") ?? "").trim();
    const packagingId = String(formData.get("packagingId") ?? "").trim();
    const qty = Number(String(formData.get("qty") ?? ""));
    const notesRaw = String(formData.get("notes") ?? "").trim();
    const notes = notesRaw.length > 0 ? notesRaw : null;
    const returnTo = String(formData.get("returnTo") ?? "/admin/orders");

    if (!orderId || !packagingId || !Number.isInteger(qty) || qty < 1) {
      return redirectWithState({
        request,
        returnTo,
        result: "invalid_fulfillment",
      });
    }

    const supabase = getSupabaseAdmin();
    const [{ data: order, error: orderError }, { data: packaging, error: packagingError }] = await Promise.all([
      supabase.from("orders").select("id").eq("id", orderId).maybeSingle(),
      supabase
        .from("packaging_catalog")
        .select("id, code, name, unit_cost, currency")
        .eq("id", packagingId)
        .maybeSingle(),
    ]);

    if (orderError || packagingError) {
      console.error("[admin.orders.packaging] dependency read failed", {
        orderError: orderError?.message ?? null,
        packagingError: packagingError?.message ?? null,
      });
      return redirectWithState({
        request,
        returnTo,
        result: "temporary_error",
      });
    }

    if (!order) {
      return redirectWithState({
        request,
        returnTo,
        result: "invalid_order",
      });
    }

    if (!packaging) {
      return redirectWithState({
        request,
        returnTo,
        result: "invalid_fulfillment",
      });
    }

    const { error } = await supabase.from("order_packaging_usage").insert({
      order_id: orderId,
      packaging_id: packaging.id,
      qty,
      unit_cost: packaging.unit_cost,
      currency: packaging.currency,
      packaging_code_snapshot: packaging.code,
      packaging_name_snapshot: packaging.name,
      notes,
    });

    if (error) {
      console.error("[admin.orders.packaging] insert failed", {
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
      result: "packaging_added",
    });
  } catch (error) {
    console.error("[admin.orders.packaging] unexpected failure", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return redirectWithState({
      request,
      returnTo: "/admin/orders",
      result: "temporary_error",
    });
  }
}
