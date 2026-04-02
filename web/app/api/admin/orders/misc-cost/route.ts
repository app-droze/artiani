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
  result: "misc_added" | "invalid_fulfillment" | "invalid_order" | "unauthorized" | "temporary_error";
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
    const amount = Number(String(formData.get("amount") ?? ""));
    const costCategory = String(formData.get("costCategory") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const notesRaw = String(formData.get("notes") ?? "").trim();
    const notes = notesRaw.length > 0 ? notesRaw : null;
    const returnTo = String(formData.get("returnTo") ?? "/admin/orders");

    if (!orderId || !costCategory || !description || !Number.isFinite(amount) || amount < 0) {
      return redirectWithState({
        request,
        returnTo,
        result: "invalid_fulfillment",
      });
    }

    const supabase = getSupabaseAdmin();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error("[admin.orders.miscCost] order read failed", {
        message: orderError.message,
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

    const { error } = await supabase.from("order_misc_costs").insert({
      order_id: orderId,
      cost_category: costCategory,
      description,
      amount,
      currency: "GEL",
      notes,
    });

    if (error) {
      console.error("[admin.orders.miscCost] insert failed", {
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
      result: "misc_added",
    });
  } catch (error) {
    console.error("[admin.orders.miscCost] unexpected failure", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return redirectWithState({
      request,
      returnTo: "/admin/orders",
      result: "temporary_error",
    });
  }
}
