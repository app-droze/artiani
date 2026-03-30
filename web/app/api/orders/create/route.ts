import { NextRequest, NextResponse } from "next/server";
import { sendOrderEmails } from "@/src/lib/emailOrders";
import { supabaseEnvDiagnostics } from "@/src/lib/env.server";
import { generateOrderCode } from "@/src/lib/orderCode";
import { priceCart } from "@/src/lib/orderPricing";
import {
  filterProductLevelImages,
  filterVariantProductImages,
  pickResolvedProductImage,
} from "@/src/lib/productImages";
import { applyRateLimit, getRateLimitFingerprint } from "@/src/lib/rateLimit";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";
import { getSupabasePublicReadClient } from "@/src/lib/supabasePublic";
import { type Locale, isLocale } from "@/src/i18n/locales";
import {
  DEFAULT_PAYMENT_METHOD,
  getInitialOrderStatusForPaymentMethod,
  isPaymentMethod,
  type PaymentMethod,
} from "@/src/lib/paymentMethod";

export const runtime = "nodejs";

const GENERIC_ERROR_MESSAGE = "Unable to create order.";
const STORAGE_BUCKET = "products";
const SHIPPING_FEE_CENTS = {
  tbilisi: 500,
  region: 1000,
} as const;
const ORDER_CREATE_RATE_LIMIT = {
  keyPrefix: "orders-create",
  maxRequests: 5,
  windowMs: 10 * 60 * 1000,
} as const;

class ValidationError extends Error {}

type DeliveryArea = keyof typeof SHIPPING_FEE_CENTS;
type PrintSide = "one_sided" | "both_sided";

type ParsedOrderRequest = {
  idempotency_key: string;
  lang: Locale;
  payment_method: PaymentMethod;
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
    material_label: string | null;
    phone_model_code: string | null;
    print_side: "one_sided" | "both_sided" | null;
    print_side_label: string | null;
  }>;
};

type CreatedOrderRow = {
  id: string;
  order_code: string;
  status: string;
  payment_method: string | null;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  note: string | null;
  total_amount: number;
};

type ExistingOrderRow = {
  id: string;
  order_code: string;
  status: string;
  payment_method: string | null;
  total_amount: number;
};

type ExistingOrderItemRow = {
  product_id: string;
  variant_id: string;
  qty: number;
  unit_price: number | string;
  line_total: number | string;
  snapshot_title: string;
  snapshot_title_en: string | null;
  snapshot_title_ka: string | null;
  snapshot_variant: string | null;
  snapshot_product_slug: string | null;
  snapshot_product_type: string | null;
  snapshot_image_url: string | null;
};

type ProductImageRow = {
  variant_id: string | null;
  image_type: string | null;
  storage_path: string;
  sort_order: number | null;
};

type ConfirmationProductRow = {
  id: string;
  slug: string;
  product_type: string;
  product_images: ProductImageRow[];
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

const asNumber = (value: unknown) => {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const isDeliveryArea = (value: string): value is DeliveryArea => value in SHIPPING_FEE_CENTS;
const isPrintSide = (value: string): value is PrintSide =>
  value === "one_sided" || value === "both_sided";

const isValidEmail = (value: string) => {
  if (value.length > 254) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
};

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
    material_label: string | null;
    phone_model_label: string | null;
    size_label: string | null;
    print_side_label: string | null;
  };
}) => {
  const parts = [
    item.options.color_label,
    item.options.background_label !== item.options.color_label ? item.options.background_label : null,
    item.options.material_label,
    item.options.phone_model_label,
    item.options.size_label,
    item.options.print_side_label,
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" · ") : null;
};

const toPublicImageUrl = (storagePath: string) =>
  getSupabasePublicReadClient().storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;

const pickImageUrl = (images: ProductImageRow[], variantId: string) => {
  const selected = pickResolvedProductImage({
    variantImages: filterVariantProductImages(images, variantId),
    productImages: filterProductLevelImages(images),
  });

  return selected ? toPublicImageUrl(selected.storage_path) : "";
};

const buildConfirmationFromPricedOrder = ({
  orderCode,
  deliveryArea,
  orderStatus,
  paymentMethod,
  priced,
  shippingFeeCents,
  lang,
}: {
  orderCode: string;
  deliveryArea: DeliveryArea;
  orderStatus: string;
  paymentMethod: PaymentMethod;
  priced: Awaited<ReturnType<typeof priceCart>>;
  shippingFeeCents: number;
  lang: Locale;
}) => ({
  code: orderCode,
  orderStatus,
  paymentMethod,
  deliveryArea,
  subtotalAmount: priced.subtotal_cents / 100,
  shippingAmount: shippingFeeCents / 100,
  totalAmount: (priced.subtotal_cents + shippingFeeCents) / 100,
  items: priced.line_items.map((item) => ({
    productId: item.product_id,
    slug: item.product_slug,
    productType: item.product_kind,
    title: lang === "ka" ? item.title_ka : item.title_en,
    imageUrl: item.image_url,
    qty: item.qty,
    unitPrice: item.unit_price_cents / 100,
    lineTotal: item.line_total_cents / 100,
    variantLabel: buildSnapshotVariant(item),
  })),
});

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const parseOrderPayload = (payload: unknown): ParsedOrderRequest => {
  const root = asRecord(payload);
  const idempotencyKey = asTrimmedString(root.idempotencyKey);
  const langRaw = asTrimmedString(root.lang);
  const paymentMethodRaw = asTrimmedString(root.paymentMethod);

  if (
    !idempotencyKey ||
    idempotencyKey.length > 200 ||
    !langRaw ||
    !isLocale(langRaw) ||
    (paymentMethodRaw !== null && !isPaymentMethod(paymentMethodRaw))
  ) {
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
    !isValidEmail(email) ||
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
    const materialLabel = item.material_label == null ? null : asTrimmedString(item.material_label);
    const phoneModelCode = item.phone_model_code == null ? null : asTrimmedString(item.phone_model_code);
    const printSideRaw = item.print_side == null ? null : asTrimmedString(item.print_side);
    const printSideLabel = item.print_side_label == null ? null : asTrimmedString(item.print_side_label);
    const printSide = printSideRaw === null ? null : isPrintSide(printSideRaw) ? printSideRaw : null;

    if (
      !productId ||
      !productSlug ||
      !variantId ||
      !Number.isInteger(qty) ||
      qty < 1 ||
      (printSideRaw !== null && !isPrintSide(printSideRaw))
    ) {
      throw new ValidationError();
    }

    return {
      product_id: productId,
      product_slug: productSlug,
      variant_id: variantId,
      qty,
      material_label: materialLabel,
      phone_model_code: phoneModelCode,
      print_side: printSide,
      print_side_label: printSideLabel,
    };
  });

  return {
    idempotency_key: idempotencyKey,
    lang: langRaw,
    payment_method: paymentMethodRaw ?? DEFAULT_PAYMENT_METHOD,
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

const rateLimited = (retryAfterSeconds: number) =>
  NextResponse.json(
    { message: GENERIC_ERROR_MESSAGE },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );

const readSupabaseErrorDetails = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return {
      code: null,
      message: "Unknown Supabase error",
      details: null,
      hint: null,
    };
  }

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };

  return {
    code: typeof candidate.code === "string" ? candidate.code : null,
    message:
      typeof candidate.message === "string" && candidate.message.trim().length > 0
        ? candidate.message
        : "Unknown Supabase error",
    details: typeof candidate.details === "string" ? candidate.details : null,
    hint: typeof candidate.hint === "string" ? candidate.hint : null,
  };
};

const isUniqueConstraintError = (error: unknown) => readSupabaseErrorDetails(error).code === "23505";

const isIdempotencyConflict = (error: unknown) => {
  const details = readSupabaseErrorDetails(error);
  const joined = [details.message, details.details, details.hint].filter(Boolean).join(" ");
  return isUniqueConstraintError(error) && /idempotency_key/i.test(joined);
};

const readExistingOrderConfirmation = async ({
  idempotencyKey,
  fallbackDeliveryArea,
  lang,
}: {
  idempotencyKey: string;
  fallbackDeliveryArea: DeliveryArea;
  lang: Locale;
}) => {
  const supabase = getSupabaseAdmin();

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const { data: existingOrderData, error: existingOrderError } = await supabase
      .from("orders")
      .select("id, order_code, status, payment_method, total_amount")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingOrderError) {
      throw existingOrderError;
    }

    const existingOrder = existingOrderData as ExistingOrderRow | null;
    if (!existingOrder) {
      if (attempt < 5) {
        await sleep(150);
        continue;
      }

      return null;
    }

    const { data: existingItemData, error: existingItemError } = await supabase
      .from("order_items")
      .select(
        "product_id, variant_id, qty, unit_price, line_total, snapshot_title, snapshot_title_en, snapshot_title_ka, snapshot_variant, snapshot_product_slug, snapshot_product_type, snapshot_image_url",
      )
      .eq("order_id", existingOrder.id);

    if (existingItemError) {
      throw existingItemError;
    }

    const existingItems = (existingItemData ?? []) as ExistingOrderItemRow[];
    if (existingItems.length === 0) {
      if (attempt < 5) {
        await sleep(150);
        continue;
      }

      return null;
    }

    const needsProductFallback = existingItems.some(
      (item) => !item.snapshot_product_slug || !item.snapshot_product_type || !item.snapshot_image_url,
    );
    const productsById = new Map<string, ConfirmationProductRow>();

    if (needsProductFallback) {
      const productIds = [...new Set(existingItems.map((item) => item.product_id))];
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("id, slug, product_type, product_images(variant_id, image_type, storage_path, sort_order)")
        .in("id", productIds);

      if (productError) {
        throw productError;
      }

      for (const product of (productData ?? []) as ConfirmationProductRow[]) {
        productsById.set(product.id, product);
      }
    }
    const subtotalCents = existingItems.reduce(
      (sum, item) => sum + Math.round(asNumber(item.line_total) * 100),
      0,
    );
    const totalCents = Math.round(asNumber(existingOrder.total_amount) * 100);
    const shippingCents = Math.max(0, totalCents - subtotalCents);
    const deliveryArea =
      shippingCents === SHIPPING_FEE_CENTS.region
        ? "region"
        : shippingCents === SHIPPING_FEE_CENTS.tbilisi
          ? "tbilisi"
          : fallbackDeliveryArea;
    const paymentMethod = isPaymentMethod(existingOrder.payment_method ?? "")
      ? existingOrder.payment_method
      : DEFAULT_PAYMENT_METHOD;

    return {
      code: existingOrder.order_code,
      orderStatus: existingOrder.status,
      paymentMethod,
      deliveryArea,
      subtotalAmount: subtotalCents / 100,
      shippingAmount: shippingCents / 100,
      totalAmount: totalCents / 100,
      items: existingItems.map((item) => {
        const product = productsById.get(item.product_id);
        const displayTitle =
          lang === "ka"
            ? item.snapshot_title_ka ?? item.snapshot_title_en ?? item.snapshot_title
            : item.snapshot_title_en ?? item.snapshot_title_ka ?? item.snapshot_title;

        return {
          productId: item.product_id,
          slug: item.snapshot_product_slug ?? product?.slug ?? "",
          productType: item.snapshot_product_type ?? product?.product_type ?? "",
          title: displayTitle,
          imageUrl:
            item.snapshot_image_url ??
            (product ? pickImageUrl(product.product_images ?? [], item.variant_id) : ""),
          qty: item.qty,
          unitPrice: asNumber(item.unit_price),
          lineTotal: asNumber(item.line_total),
          variantLabel: item.snapshot_variant,
        };
      }),
    };
  }

  return null;
};

const cleanupFailedOrder = async (orderId: string, orderCode: string) => {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", orderId);

  if (error) {
    console.error("[orders.create] failed order cleanup failed", {
      orderId,
      orderCode,
      ...readSupabaseErrorDetails(error),
      clientPath: "admin",
      adminKeyEnv: supabaseEnvDiagnostics.chosenAdminKeyEnv,
    });
    return false;
  }

  console.warn("[orders.create] rolled back failed order", {
    orderId,
    orderCode,
    clientPath: "admin",
    adminKeyEnv: supabaseEnvDiagnostics.chosenAdminKeyEnv,
  });
  return true;
};

export async function POST(request: NextRequest) {
  const rateLimit = applyRateLimit(request, ORDER_CREATE_RATE_LIMIT);
  if (!rateLimit.allowed) {
    console.warn("[orders.create] rate limited", {
      key: getRateLimitFingerprint(request, ORDER_CREATE_RATE_LIMIT),
      limit: rateLimit.limit,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
    return rateLimited(rateLimit.retryAfterSeconds);
  }

  let parsed: ParsedOrderRequest;

  try {
    parsed = parseOrderPayload(await request.json());
  } catch (error) {
    console.warn("[orders.create] invalid request payload", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return badRequest();
  }

  console.info("[orders.create] request accepted", {
    itemCount: parsed.items.length,
    deliveryArea: parsed.customer.delivery_area,
    paymentMethod: parsed.payment_method,
    pricingClientPath: "admin",
    writeClientPath: "admin",
    adminKeyEnv: supabaseEnvDiagnostics.chosenAdminKeyEnv,
  });

  let priced;
  try {
    priced = await priceCart(parsed.items);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown order pricing failure";
    console.error("[orders.create] order pricing failed", {
      message,
      adminKeyEnv: supabaseEnvDiagnostics.chosenAdminKeyEnv,
    });
    return badRequest();
  }
  const shippingFeeCents = SHIPPING_FEE_CENTS[parsed.customer.delivery_area];
  const totalCents = priced.subtotal_cents + shippingFeeCents;
  const orderStatus = getInitialOrderStatusForPaymentMethod(parsed.payment_method);

  const supabase = getSupabaseAdmin();

  let order: CreatedOrderRow;
  try {
    let createdOrder: CreatedOrderRow | null = null;

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const orderCode = generateOrderCode();

      console.info("[orders.create] inserting order row", {
        orderCode,
        clientPath: "admin",
        adminKeyEnv: supabaseEnvDiagnostics.chosenAdminKeyEnv,
      });
      const { data, error } = await supabase
        .from("orders")
        .insert({
          idempotency_key: parsed.idempotency_key,
          order_code: orderCode,
          status: orderStatus,
          payment_method: parsed.payment_method,
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
          "id, order_code, status, payment_method, customer_name, email, phone, address, note, total_amount",
        )
        .single();

      if (error) {
        if (isIdempotencyConflict(error)) {
          const existingConfirmation = await readExistingOrderConfirmation({
            idempotencyKey: parsed.idempotency_key,
            fallbackDeliveryArea: parsed.customer.delivery_area,
            lang: parsed.lang,
          });

          if (existingConfirmation) {
            return NextResponse.json(existingConfirmation);
          }

          throw error;
        }

        if (isUniqueConstraintError(error) && attempt < 5) {
          continue;
        }

        throw error;
      }

      createdOrder = data as CreatedOrderRow;
      break;
    }

    if (!createdOrder) {
      throw new Error("Unable to create order after retrying unique order_code collisions.");
    }

    order = createdOrder;
  } catch (error) {
    console.error("[orders.create] order insert failed", {
      ...readSupabaseErrorDetails(error),
      clientPath: "admin",
      adminKeyEnv: supabaseEnvDiagnostics.chosenAdminKeyEnv,
    });
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
    snapshot_title_en: item.title_en,
    snapshot_title_ka: item.title_ka,
    snapshot_variant: buildSnapshotVariant(item),
    snapshot_product_slug: item.product_slug,
    snapshot_product_type: item.product_kind,
    snapshot_image_url: item.image_url,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(itemRows);
  if (itemsError) {
    console.error("[orders.create] order items insert failed", {
      ...readSupabaseErrorDetails(itemsError),
      itemCount: itemRows.length,
      clientPath: "admin",
      adminKeyEnv: supabaseEnvDiagnostics.chosenAdminKeyEnv,
    });

    await cleanupFailedOrder(order.id, order.order_code);
    return serverError();
  }

  const purchasedPaintingVariantIds = [
    ...new Set(
      priced.line_items
        .filter((item) => item.product_kind === "painting" && Boolean(item.options.variant_id))
        .map((item) => item.options.variant_id as string),
    ),
  ];

  if (purchasedPaintingVariantIds.length > 0) {
    const { error: paintingStockError } = await supabase
      .from("product_variants")
      .update({ stock_status: "out_of_stock" })
      .in("id", purchasedPaintingVariantIds);

    if (paintingStockError) {
      console.error("[orders.create] painting stock update failed", {
        ...readSupabaseErrorDetails(paintingStockError),
        itemCount: purchasedPaintingVariantIds.length,
        clientPath: "admin",
        adminKeyEnv: supabaseEnvDiagnostics.chosenAdminKeyEnv,
      });

      await cleanupFailedOrder(order.id, order.order_code);
      return serverError();
    }
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
        payment_method: parsed.payment_method,
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
    emailAttempted,
    emailSent,
    emailDebugReason,
    ...buildConfirmationFromPricedOrder({
      orderCode: order.order_code,
      deliveryArea: parsed.customer.delivery_area,
      orderStatus,
      paymentMethod: parsed.payment_method,
      priced,
      shippingFeeCents,
      lang: parsed.lang,
    }),
  });
}
