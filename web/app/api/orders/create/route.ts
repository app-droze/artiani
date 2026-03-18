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
  order_code: string;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  note: string | null;
  total_amount: number;
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

const buildSnapshotVariant = (item: {
  options: {
    color_label: string | null;
    background_label: string | null;
    size_label: string | null;
  };
}) => {
  const parts = [
    item.options.color_label,
    item.options.background_label !== item.options.color_label ? item.options.background_label : null,
    item.options.size_label,
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" · ") : null;
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
          order_code: orderCode,
          status: "awaiting_payment",
          lang: parsed.lang,
          currency: "GEL",
          total_amount: totalCents / 100,
          customer_name: parsed.customer.name,
          email: parsed.customer.email,
          phone: parsed.customer.phone,
          address: parsed.customer.address,
          note: parsed.customer.note,
        })
        .select(
          "id, order_code, customer_name, email, phone, address, note, total_amount",
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
    product_id: item.product_id,
    variant_id: item.options.variant_id,
    qty: item.qty,
    unit_price: item.unit_price_cents / 100,
    line_total: item.line_total_cents / 100,
    snapshot_title: parsed.lang === "ka" ? item.title_ka : item.title_en,
    snapshot_variant: buildSnapshotVariant(item),
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(itemRows);
  if (itemsError) {
    console.error("Order items insert failed", itemsError);
    return serverError();
  }

  let emailSent = true;
  let emailAttempted = false;
  let emailDebugReason: string | null = null;
  try {
    console.info("[orders.create] order persisted before email send", {
      orderCode: order.order_code,
      orderId: order.id,
    });
    const emailResult = await sendOrderEmails({
      order: {
        code: order.order_code,
        customer_name: order.customer_name,
        customer_email: order.email,
        customer_phone: order.phone,
        delivery_area: parsed.customer.delivery_area,
        address: order.address,
        customer_note: order.note,
        subtotal_cents: priced.subtotal_cents,
        total_cents: totalCents,
      },
      items: priced.line_items,
      lang: parsed.lang,
    });
    emailAttempted = emailResult.emailAttempted;
    emailSent = emailResult.emailSent;
    emailDebugReason = emailResult.emailDebugReason;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown order email failure";
    emailSent = false;
    emailAttempted = true;
    emailDebugReason = "route_email_exception";
    console.error("[orders.create] order emails failed", { message });
  }

  return NextResponse.json({
    code: order.order_code,
    emailAttempted,
    emailSent,
    emailDebugReason,
  });
}
