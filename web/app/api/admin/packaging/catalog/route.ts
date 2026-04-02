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
  result: "packaging_created" | "invalid_fulfillment" | "duplicate_packaging" | "unauthorized" | "temporary_error";
}) => {
  const url = new URL(resolveSafeAdminRedirectPath(returnTo), request.url);
  url.searchParams.set("result", result);
  return NextResponse.redirect(url);
};

const normalizePackagingCode = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");

const isUniqueViolation = (error: unknown) =>
  Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "23505");

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
    const code = normalizePackagingCode(String(formData.get("code") ?? ""));
    const name = String(formData.get("name") ?? "").trim();
    const unitCost = Number(String(formData.get("unitCost") ?? ""));
    const notesRaw = String(formData.get("notes") ?? "").trim();
    const notes = notesRaw.length > 0 ? notesRaw : null;
    const returnTo = String(formData.get("returnTo") ?? "/admin/fulfillment");

    if (!code || !name || !Number.isFinite(unitCost) || unitCost < 0) {
      return redirectWithState({
        request,
        returnTo,
        result: "invalid_fulfillment",
      });
    }

    const { error } = await getSupabaseAdmin().from("packaging_catalog").insert({
      code,
      name,
      unit_cost: unitCost,
      currency: "GEL",
      notes,
    });

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
