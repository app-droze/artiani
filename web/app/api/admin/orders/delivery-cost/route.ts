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
  result: "delivery_added" | "invalid_fulfillment" | "invalid_order" | "unauthorized" | "temporary_error";
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
    const providerRaw = String(formData.get("provider") ?? "").trim();
    const provider = providerRaw.length > 0 ? providerRaw : null;
    const notesRaw = String(formData.get("notes") ?? "").trim();
    const notes = notesRaw.length > 0 ? notesRaw : null;
    const returnTo = String(formData.get("returnTo") ?? "/admin/orders");

    if (!orderId || !Number.isFinite(amount) || amount < 0) {
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
      console.error("[admin.orders.deliveryCost] order read failed", {
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

    const { error } = await supabase.from("order_delivery_costs").insert({
      order_id: orderId,
      amount,
      currency: "GEL",
      provider,
      notes,
    });

    if (error) {
      console.error("[admin.orders.deliveryCost] insert failed", {
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
      result: "delivery_added",
    });
  } catch (error) {
    console.error("[admin.orders.deliveryCost] unexpected failure", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return redirectWithState({
      request,
      returnTo: "/admin/orders",
      result: "temporary_error",
    });
  }
}
