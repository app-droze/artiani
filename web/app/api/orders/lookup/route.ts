import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";

export const runtime = "nodejs";

const GENERIC_ERROR_MESSAGE = "Order not found.";

class ValidationError extends Error {}

type ParsedLookupRequest = {
  code: string;
  email: string;
};

type OrderLookupRow = {
  id: string;
  code: string;
  status: string;
  currency: string;
  address: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_note: string | null;
  subtotal_cents: number;
  total_cents: number;
  created_at: string;
};

type OrderItemLookupRow = {
  product_slug: string;
  product_kind: string;
  title_en: string;
  title_ka: string;
  image_url: string | null;
  qty: number;
  unit_price_cents: number;
  line_total_cents: number;
  options: Record<string, unknown> | null;
};

const asRecord = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError();
  }

  return value as Record<string, unknown>;
};

const asTrimmedString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseLookupPayload = (payload: unknown): ParsedLookupRequest => {
  const root = asRecord(payload);
  const code = asTrimmedString(root.code);
  const email = asTrimmedString(root.email);

  if (!code || !email) {
    throw new ValidationError();
  }

  return {
    code,
    email: email.toLowerCase(),
  };
};

const badRequest = () =>
  NextResponse.json({ message: GENERIC_ERROR_MESSAGE }, { status: 400 });

const notFound = () =>
  NextResponse.json({ message: GENERIC_ERROR_MESSAGE }, { status: 404 });

const serverError = () =>
  NextResponse.json({ message: GENERIC_ERROR_MESSAGE }, { status: 500 });

export async function POST(request: NextRequest) {
  let parsed: ParsedLookupRequest;

  try {
    parsed = parseLookupPayload(await request.json());
  } catch {
    return badRequest();
  }

  const supabase = getSupabaseAdmin();
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, code, status, currency, address, customer_name, customer_email, customer_phone, customer_note, subtotal_cents, total_cents, created_at",
    )
    .eq("code", parsed.code)
    .eq("customer_email", parsed.email)
    .maybeSingle();

  if (orderError) {
    console.error("Order lookup failed", orderError);
    return serverError();
  }

  if (!orderData) {
    return notFound();
  }

  const order = orderData as OrderLookupRow;
  const { data: itemRows, error: itemError } = await supabase
    .from("order_items")
    .select(
      "product_slug, product_kind, title_en, title_ka, image_url, qty, unit_price_cents, line_total_cents, options",
    )
    .eq("order_id", order.id);

  if (itemError) {
    console.error("Order items lookup failed", itemError);
    return serverError();
  }

  return NextResponse.json({
    order: {
      code: order.code,
      status: order.status,
      currency: order.currency,
      address: order.address,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      customer_note: order.customer_note,
      subtotal_cents: order.subtotal_cents,
      total_cents: order.total_cents,
      created_at: order.created_at,
      items: (itemRows ?? []) as OrderItemLookupRow[],
    },
  });
}
