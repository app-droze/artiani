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
  result: "expense_added" | "invalid_expense" | "unauthorized" | "temporary_error";
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
      returnTo: "/admin/expenses",
      result: "unauthorized",
    });
  }

  try {
    const formData = await request.formData();
    const incurredOn = String(formData.get("incurredOn") ?? "").trim();
    const expenseCategory = String(formData.get("expenseCategory") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const amount = Number(String(formData.get("amount") ?? ""));
    const vendorRaw = String(formData.get("vendor") ?? "").trim();
    const notesRaw = String(formData.get("notes") ?? "").trim();
    const vendor = vendorRaw.length > 0 ? vendorRaw : null;
    const notes = notesRaw.length > 0 ? notesRaw : null;
    const returnTo = String(formData.get("returnTo") ?? "/admin/expenses");

    if (!incurredOn || !expenseCategory || !description || !Number.isFinite(amount) || amount < 0) {
      return redirectWithState({
        request,
        returnTo,
        result: "invalid_expense",
      });
    }

    const { error } = await getSupabaseAdmin().from("business_expenses").insert({
      incurred_on: incurredOn,
      expense_category: expenseCategory,
      description,
      amount,
      currency: "GEL",
      vendor,
      notes,
    });

    if (error) {
      console.error("[admin.expenses] insert failed", {
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
      result: "expense_added",
    });
  } catch (error) {
    console.error("[admin.expenses] unexpected failure", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return redirectWithState({
      request,
      returnTo: "/admin/expenses",
      result: "temporary_error",
    });
  }
}
