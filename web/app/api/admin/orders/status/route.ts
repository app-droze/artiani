import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionCookieName, resolveSafeAdminRedirectPath, verifyAdminSessionToken } from "@/src/lib/adminSession";
import { isOrderStatus } from "@/src/lib/orderStatus";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";

export const runtime = "nodejs";

const redirectWithState = ({
  request,
  returnTo,
  result,
}: {
  request: NextRequest;
  returnTo: string;
  result: "updated" | "invalid_status" | "invalid_order" | "unauthorized" | "temporary_error";
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
    const status = String(formData.get("status") ?? "").trim();
    const returnTo = String(formData.get("returnTo") ?? "/admin/orders");

    if (!orderId) {
      return redirectWithState({
        request,
        returnTo,
        result: "invalid_order",
      });
    }

    if (!isOrderStatus(status)) {
      return redirectWithState({
        request,
        returnTo,
        result: "invalid_status",
      });
    }

    const supabase = getSupabaseAdmin();
    const { error, data } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[admin.orders.status] update failed", {
        message: error.message,
      });
      return redirectWithState({
        request,
        returnTo,
        result: "temporary_error",
      });
    }

    if (!data) {
      return redirectWithState({
        request,
        returnTo,
        result: "invalid_order",
      });
    }

    return redirectWithState({
      request,
      returnTo,
      result: "updated",
    });
  } catch (error) {
    console.error("[admin.orders.status] unexpected failure", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return redirectWithState({
      request,
      returnTo: "/admin/orders",
      result: "temporary_error",
    });
  }
}
