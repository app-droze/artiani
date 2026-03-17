import { NextRequest, NextResponse } from "next/server";
import { sendOrderEmails } from "@/src/lib/emailOrders";
import { insertWithOrderCodeRetry } from "@/src/lib/orderCode";
import { priceCart } from "@/src/lib/orderPricing";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";
import { type Locale, isLocale } from "@/src/i18n/locales";

export const runtime = "nodejs";

const GENERIC_ERROR_MESSAGE = "Unable to create order.";
const SHIPPING_FEE_CENTS = {
  tbilisi: 500,
  region: 1000,
} as const;

class ValidationError extends Error {}

type DeliveryArea = keyof typeof SHIPPING_FEE_CENTS;

type ParsedOrderRequest = {
  lang: Locale;
  customer: {
    name: string;
    email: string;
    phone: string;
    delivery_area: DeliveryArea;
    address: string;
    note: string | null;
  };
  items: Array<{
    product_id: string;
    product_slug: string;
    variant_id: string;
    qty: number;
  }>;
};

type CreatedOrderRow = {
  id: string;
  code: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address: string;
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

const isDeliveryArea = (value: string): value is DeliveryArea => value in SHIPPING_FEE_CENTS;

const isValidPhone = (value: string) => {
  const normalized = value.replace(/[^\d+]/g, "");
  const digitsOnly = normalized.replace(/\D/g, "");

  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return false;
  }

  return /^\+?[\d\s\-()]+$/.test(value);
};

const parseOrderPayload = (payload: unknown): ParsedOrderRequest => {
  const root = asRecord(payload);
  const langRaw = asTrimmedString(root.lang);

  if (!langRaw || !isLocale(langRaw)) {
    throw new ValidationError();
  }

  const customer = asRecord(root.customer);
  const name = asTrimmedString(customer.name);
  const email = asTrimmedString(customer.email);
  const phone = asTrimmedString(customer.phone);
  const deliveryArea = asTrimmedString(customer.delivery_area);
  const address = asTrimmedString(customer.address);
  const note = customer.note == null ? null : asTrimmedString(customer.note);

  if (
    !name ||
    !email ||
    !phone ||
    !deliveryArea ||
    !isDeliveryArea(deliveryArea) ||
    !address ||
    !isValidPhone(phone)
  ) {
    throw new ValidationError();
  }

  if (!Array.isArray(root.items) || root.items.length === 0) {
    throw new ValidationError();
  }

  const items = root.items.map((entry) => {
    const item = asRecord(entry);
    const productId = asTrimmedString(item.product_id);
    const productSlug = asTrimmedString(item.product_slug);
    const variantId = asTrimmedString(item.variant_id);
    const qty = Number(item.qty);

    if (!productId || !productSlug || !variantId || !Number.isInteger(qty) || qty < 1) {
      throw new ValidationError();
    }

    return {
      product_id: productId,
      product_slug: productSlug,
      variant_id: variantId,
      qty,
    };
  });

  return {
    lang: langRaw,
    customer: {
      name,
      email: email.toLowerCase(),
      phone,
      delivery_area: deliveryArea,
      address,
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
    parsed = parseOrderPayload(await request.json());
  } catch {
    return badRequest();
  }

  let priced;
  try {
    priced = await priceCart(parsed.items);
  } catch (error) {
    console.error("Order pricing failed", error);
    return badRequest();
  }
  const shippingFeeCents = SHIPPING_FEE_CENTS[parsed.customer.delivery_area];
  const totalCents = priced.subtotal_cents + shippingFeeCents;

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
          total_cents: totalCents,
          customer_name: parsed.customer.name,
          customer_email: parsed.customer.email,
          customer_phone: parsed.customer.phone,
          address: parsed.customer.address,
          customer_note: parsed.customer.note,
        })
        .select(
          "id, code, customer_name, customer_email, customer_phone, address, customer_note, subtotal_cents, total_cents",
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

  const { error: itemsError } = await supabase.from("order_items").insert(itemRows);
  if (itemsError) {
    console.error("Order items insert failed", itemsError);
    return serverError();
  }

  let emailSent = true;
  try {
    const emailResult = await sendOrderEmails({
      order,
      items: priced.line_items,
      lang: parsed.lang,
    });
    emailSent = emailResult.emailSent;
  } catch (error) {
    emailSent = false;
    console.error("Order emails failed", error);
  }

  return NextResponse.json({
    code: order.code,
    emailSent,
  });
}
