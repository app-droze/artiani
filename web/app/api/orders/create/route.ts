import { NextRequest, NextResponse } from "next/server";
import { sendOrderEmails } from "@/src/lib/emailOrders";
import { insertWithOrderCodeRetry } from "@/src/lib/orderCode";
import { priceCart, type OrderItemInput } from "@/src/lib/orderPricing";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";
import { type Locale, isLocale } from "@/src/i18n/locales";

export const runtime = "nodejs";

const GENERIC_ERROR_MESSAGE = "Unable to create order.";

class ValidationError extends Error {}

type ParsedOrderRequest = {
  lang: Locale;
  customer: {
    name: string;
    email: string;
    phone: string;
    note: string | null;
  };
  items: OrderItemInput[];
};

type CreatedOrderRow = {
  id: string;
  code: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_note: string | null;
  subtotal_cents: number;
  total_cents: number;
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

const parseOrderPayload = (payload: unknown): ParsedOrderRequest => {
  const root = asRecord(payload);

  const langRaw = asTrimmedString(root.lang);
  if (!langRaw || !isLocale(langRaw)) {
    throw new ValidationError();
  }

  const customer = asRecord(root.customer);
  const name = asTrimmedString(customer.name);
  const emailRaw = asTrimmedString(customer.email);
  const phone = asTrimmedString(customer.phone);
  if (!name || !emailRaw || !phone) {
    throw new ValidationError();
  }

  const noteRaw =
    customer.note === undefined || customer.note === null
      ? null
      : asTrimmedString(customer.note);
  const note = noteRaw && noteRaw.length > 0 ? noteRaw : null;

  if (!Array.isArray(root.items) || root.items.length === 0) {
    throw new ValidationError();
  }

  const items: OrderItemInput[] = root.items.map((entry) => {
    const item = asRecord(entry);
    const slug = asTrimmedString(item.slug);
    if (!slug) {
      throw new ValidationError();
    }

    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1) {
      throw new ValidationError();
    }

    const options =
      item.options && typeof item.options === "object" && !Array.isArray(item.options)
        ? (item.options as Record<string, unknown>)
        : undefined;

    return { slug, qty, options };
  });

  return {
    lang: langRaw,
    customer: {
      name,
      email: emailRaw.toLowerCase(),
      phone,
      note,
    },
    items,
  };
};

const badRequest = () =>
  NextResponse.json({ message: GENERIC_ERROR_MESSAGE }, { status: 400 });

const serverError = () =>
  NextResponse.json({ message: GENERIC_ERROR_MESSAGE }, { status: 500 });

export async function POST(request: NextRequest) {
  let parsed: ParsedOrderRequest;
  try {
    const payload = await request.json();
    parsed = parseOrderPayload(payload);
  } catch (error) {
    if (error instanceof ValidationError) {
      return badRequest();
    }
    return badRequest();
  }

  let priced;
  try {
    priced = priceCart(parsed.items);
  } catch {
    return badRequest();
  }

  const supabase = getSupabaseAdmin();

  let order: CreatedOrderRow;
  try {
    const { result } = await insertWithOrderCodeRetry(async (orderCode) => {
      const { data, error } = await supabase
        .from("orders")
        .insert({
          code: orderCode,
          status: "NEW",
          lang: parsed.lang,
          currency: "GEL",
          subtotal_cents: priced.subtotal_cents,
          total_cents: priced.total_cents,
          customer_name: parsed.customer.name,
          customer_email: parsed.customer.email,
          customer_phone: parsed.customer.phone,
          customer_note: parsed.customer.note,
        })
        .select(
          "id, code, customer_name, customer_email, customer_phone, customer_note, subtotal_cents, total_cents",
        )
        .single();

      if (error) {
        throw error;
      }

      return data as CreatedOrderRow;
    });
    order = result;
  } catch (error) {
    console.error("Order insert failed", error);
    return serverError();
  }

  const itemRows = priced.line_items.map((item) => ({
    order_id: order.id,
    product_slug: item.product_slug,
    product_kind: item.product_kind,
    title_en: item.title_en,
    title_ka: item.title_ka,
    image_url: item.image_url,
    qty: item.qty,
    unit_price_cents: item.unit_price_cents,
    line_total_cents: item.line_total_cents,
    options: item.options,
  }));

  const { error: orderItemsError } = await supabase.from("order_items").insert(itemRows);
  if (orderItemsError) {
    console.error("Order items insert failed", orderItemsError);
    return serverError();
  }

  let emailSent = true;
  try {
    await sendOrderEmails({
      order,
      items: priced.line_items,
      lang: parsed.lang,
    });
  } catch (error) {
    emailSent = false;
    console.error("Order emails failed", error);
  }

  return NextResponse.json({ code: order.code, emailSent });
}
