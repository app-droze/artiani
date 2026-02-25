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
  subtotal_cents: number;
  total_cents: number;
  created_at: string;
};

type OrderItemLookupRow = {
  order_id: string;
  product_slug: string;
  product_kind: string;
  title_en: string;
  title_ka: string;
  image_url: string;
  qty: number;
  unit_price_cents: number;
  line_total_cents: number;
  options: Record<string, unknown> | null;
};

type BidLookupRow = {
  code: string;
  status: string;
  product_slug: string;
  bid_amount_cents: number;
  note: string | null;
  created_at: string;
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
  const codeRaw = asTrimmedString(root.code);
  const emailRaw = asTrimmedString(root.email);
  if (!codeRaw || !emailRaw) {
    throw new ValidationError();
  }

  return {
    code: codeRaw,
    email: emailRaw.toLowerCase(),
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
    const payload = await request.json();
    parsed = parseLookupPayload(payload);
  } catch (error) {
    if (error instanceof ValidationError) {
      return badRequest();
    }
    return badRequest();
  }

  const supabase = getSupabaseAdmin();

  const { data: matchedOrder, error: orderMatchError } = await supabase
    .from("orders")
    .select("id")
    .eq("code", parsed.code)
    .eq("customer_email", parsed.email)
    .maybeSingle();

  if (orderMatchError) {
    console.error("Order lookup failed", orderMatchError);
    return serverError();
  }

  const { data: matchedBid, error: bidMatchError } = await supabase
    .from("bids")
    .select("code")
    .eq("code", parsed.code)
    .eq("bidder_email", parsed.email)
    .maybeSingle();

  if (bidMatchError) {
    console.error("Bid lookup failed", bidMatchError);
    return serverError();
  }

  if (!matchedOrder && !matchedBid) {
    return notFound();
  }

  const { data: ordersData, error: ordersError } = await supabase
    .from("orders")
    .select("id, code, status, currency, subtotal_cents, total_cents, created_at")
    .eq("customer_email", parsed.email)
    .order("created_at", { ascending: false });

  if (ordersError) {
    console.error("Orders lookup failed", ordersError);
    return serverError();
  }

  const orders = (ordersData ?? []) as OrderLookupRow[];
  const orderIds = orders.map((order) => order.id);
  const itemsByOrder = new Map<string, OrderItemLookupRow[]>();

  if (orderIds.length > 0) {
    const { data: itemRows, error: itemError } = await supabase
      .from("order_items")
      .select(
        "order_id, product_slug, product_kind, title_en, title_ka, image_url, qty, unit_price_cents, line_total_cents, options",
      )
      .in("order_id", orderIds);

    if (itemError) {
      console.error("Order items lookup failed", itemError);
      return serverError();
    }

    for (const row of (itemRows ?? []) as OrderItemLookupRow[]) {
      const existing = itemsByOrder.get(row.order_id);
      if (existing) {
        existing.push(row);
      } else {
        itemsByOrder.set(row.order_id, [row]);
      }
    }
  }

  const { data: bidsData, error: bidsError } = await supabase
    .from("bids")
    .select("code, status, product_slug, bid_amount_cents, note, created_at")
    .eq("bidder_email", parsed.email)
    .order("created_at", { ascending: false });

  if (bidsError) {
    console.error("Bids lookup failed", bidsError);
    return serverError();
  }

  const bids = (bidsData ?? []) as BidLookupRow[];

  if (orders.length === 0 && bids.length === 0) {
    return notFound();
  }

  return NextResponse.json({
    orders: orders.map((order) => ({
      code: order.code,
      status: order.status,
      currency: order.currency,
      subtotal_cents: order.subtotal_cents,
      total_cents: order.total_cents,
      created_at: order.created_at,
      items: (itemsByOrder.get(order.id) ?? []).map((item) => ({
        product_slug: item.product_slug,
        product_kind: item.product_kind,
        title_en: item.title_en,
        title_ka: item.title_ka,
        image_url: item.image_url,
        qty: item.qty,
        unit_price_cents: item.unit_price_cents,
        line_total_cents: item.line_total_cents,
        options: item.options,
      })),
    })),
    bids: bids.map((bid) => ({
      code: bid.code,
      status: bid.status,
      product_slug: bid.product_slug,
      bid_amount_cents: bid.bid_amount_cents,
      note: bid.note,
      created_at: bid.created_at,
    })),
  });
}
