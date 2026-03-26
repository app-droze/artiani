import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, getRateLimitFingerprint } from "@/src/lib/rateLimit";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";
import { sendAuctionBidEmails } from "@/src/lib/emailBids";
import { defaultLocale, isLocale, type Locale } from "@/src/i18n/locales";

export const runtime = "nodejs";

const AUCTION_BID_RATE_LIMIT = {
  keyPrefix: "auction-bid",
  maxRequests: 10,
  windowMs: 10 * 60 * 1000,
} as const;

class ValidationError extends Error {}

type ParsedBidRequest = {
  auctionEventId: string | null;
  productSlug: string | null;
  orderCode: string;
  email: string;
  bidAmount: number;
  lang: Locale;
};

type PlaceAuctionBidRpcRow = {
  ok: boolean | null;
  failure_reason: string | null;
  auction_event_id: string | null;
  bid_id: string | null;
  current_effective_bid: number | null;
  auction_end_time: string | null;
  minimum_next_valid_bid: number | null;
};

const GENERIC_ERROR_MESSAGE = "Unable to place bid.";
const TEMPORARY_ERROR_MESSAGE = "Unable to place bid right now.";

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
  return Number.isFinite(numberValue) ? numberValue : NaN;
};

const isValidEmail = (value: string) => {
  if (value.length > 254) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
};

const parseBidPayload = (payload: unknown): ParsedBidRequest => {
  const root = asRecord(payload);
  const auctionEventId = asTrimmedString(root.auctionEventId);
  const productSlug = asTrimmedString(root.productSlug);
  const orderCode = asTrimmedString(root.orderCode);
  const email = asTrimmedString(root.email);
  const bidAmount = asNumber(root.bidAmount);
  const langRaw = asTrimmedString(root.lang);
  const lang = langRaw && isLocale(langRaw) ? langRaw : defaultLocale;

  if ((!auctionEventId && !productSlug) || !orderCode || !email || !isValidEmail(email) || !Number.isFinite(bidAmount) || bidAmount <= 0) {
    throw new ValidationError();
  }

  return {
    auctionEventId,
    productSlug,
    orderCode: orderCode.toUpperCase(),
    email: email.toLowerCase(),
    bidAmount,
    lang,
  };
};

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

const responseForFailureReason = (failureReason: string) => {
  if (failureReason === "invalid_payload") {
    return { status: 400, code: failureReason };
  }

  if (failureReason === "order_not_found") {
    return { status: 404, code: failureReason };
  }

  if (failureReason === "order_not_eligible" || failureReason === "email_mismatch") {
    return { status: 403, code: failureReason };
  }

  if (
    failureReason === "auction_not_live" ||
    failureReason === "auction_ended" ||
    failureReason === "bid_too_low"
  ) {
    return { status: 409, code: failureReason };
  }

  return { status: 400, code: failureReason };
};

const resolveAuctionEventId = async (
  supabase: ReturnType<typeof getSupabaseAdmin>,
  parsed: ParsedBidRequest,
) => {
  if (parsed.auctionEventId) {
    return parsed.auctionEventId;
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("slug", parsed.productSlug!)
    .maybeSingle();

  if (productError) {
    throw productError;
  }

  if (!product?.id) {
    return null;
  }

  const { data: event, error: eventError } = await supabase
    .from("auction_events")
    .select("id")
    .eq("product_id", product.id)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (eventError) {
    throw eventError;
  }

  return event?.id ?? null;
};

const pickProductTitle = (
  translations: Array<{ lang: string | null; title: string | null }> | null | undefined,
  lang: Locale,
  fallback: string,
) => {
  const rows = translations ?? [];
  const preferred =
    rows.find((translation) => translation.lang === lang && translation.title?.trim()) ??
    rows.find((translation) => translation.lang === "en" && translation.title?.trim()) ??
    rows.find((translation) => translation.title?.trim());

  return preferred?.title?.trim() ?? fallback;
};

const sendBidNotificationEmails = async ({
  supabase,
  parsed,
  bidId,
  auctionEventId,
  auctionEndTime,
  currentEffectiveBid,
}: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  parsed: ParsedBidRequest;
  bidId: string;
  auctionEventId: string;
  auctionEndTime: string;
  currentEffectiveBid: number;
}) => {
  const [{ data: order, error: orderError }, { data: event, error: eventError }] = await Promise.all([
    supabase
      .from("orders")
      .select("customer_name, email")
      .eq("order_code", parsed.orderCode)
      .maybeSingle(),
    supabase
      .from("auction_events")
      .select("product_id")
      .eq("id", auctionEventId)
      .maybeSingle(),
  ]);

  if (orderError) {
    throw orderError;
  }

  if (eventError) {
    throw eventError;
  }

  if (!order?.customer_name || !order?.email || !event?.product_id) {
    throw new Error("Missing bid email context");
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("slug, product_translations(lang, title)")
    .eq("id", event.product_id)
    .maybeSingle();

  if (productError) {
    throw productError;
  }

  const productSlug = product?.slug ?? parsed.productSlug ?? "auction-product";
  const productTitle = pickProductTitle(
    (product?.product_translations ?? []) as Array<{ lang: string | null; title: string | null }>,
    parsed.lang,
    productSlug,
  );

  return sendAuctionBidEmails({
    lang: parsed.lang,
    bid: {
      bidId,
      productSlug,
      productTitle,
      bidderName: order.customer_name,
      bidderEmail: order.email,
      orderCode: parsed.orderCode,
      bidAmount: currentEffectiveBid,
      auctionEndTime,
    },
  });
};

const rateLimited = (retryAfterSeconds: number) =>
  NextResponse.json(
    { success: false, code: "rate_limited", message: TEMPORARY_ERROR_MESSAGE },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );

export async function POST(request: NextRequest) {
  const rateLimit = applyRateLimit(request, AUCTION_BID_RATE_LIMIT);
  if (!rateLimit.allowed) {
    console.warn("[auction.bid] rate limited", {
      key: getRateLimitFingerprint(request, AUCTION_BID_RATE_LIMIT),
      limit: rateLimit.limit,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
    return rateLimited(rateLimit.retryAfterSeconds);
  }

  let parsed: ParsedBidRequest;

  try {
    parsed = parseBidPayload(await request.json());
  } catch {
    return NextResponse.json(
      { success: false, code: "invalid_payload", message: GENERIC_ERROR_MESSAGE },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  try {
    const auctionEventId = await resolveAuctionEventId(supabase, parsed);

    if (!auctionEventId) {
      return NextResponse.json(
        { success: false, code: "auction_not_live", message: GENERIC_ERROR_MESSAGE },
        { status: 409 },
      );
    }

    const { data, error } = await supabase.rpc("place_auction_bid", {
      p_auction_event_id: auctionEventId,
      p_order_code: parsed.orderCode,
      p_email: parsed.email,
      p_bid_amount: parsed.bidAmount,
    });

    if (error) {
      console.error("[auction.bid] rpc failed", {
        auctionEventId,
        ...readSupabaseErrorDetails(error),
      });
      return NextResponse.json(
        { success: false, code: "temporary_error", message: TEMPORARY_ERROR_MESSAGE },
        { status: 500 },
      );
    }

    const result = Array.isArray(data) ? (data[0] as PlaceAuctionBidRpcRow | undefined) : undefined;

    if (!result) {
      return NextResponse.json(
        { success: false, code: "temporary_error", message: TEMPORARY_ERROR_MESSAGE },
        { status: 500 },
      );
    }

    if (result.ok !== true) {
      const failureReason = result.failure_reason ?? "temporary_error";
      const failure = responseForFailureReason(failureReason);

      return NextResponse.json(
        {
          success: false,
          code: failure.code,
          message: GENERIC_ERROR_MESSAGE,
          currentEffectiveBid: result.current_effective_bid,
          auctionEndTime: result.auction_end_time,
          minimumNextValidBid: result.minimum_next_valid_bid,
        },
        { status: failure.status },
      );
    }

    if (
      typeof result.bid_id === "string" &&
      typeof result.auction_event_id === "string" &&
      typeof result.auction_end_time === "string" &&
      typeof result.current_effective_bid === "number"
    ) {
      try {
        const emailResult = await sendBidNotificationEmails({
          supabase,
          parsed,
          bidId: result.bid_id,
          auctionEventId: result.auction_event_id,
          auctionEndTime: result.auction_end_time,
          currentEffectiveBid: result.current_effective_bid,
        });

        console.info("[auction.bid] bid persisted before email send", {
          auctionEventId: result.auction_event_id,
          bidId: result.bid_id,
          emailAttempted: emailResult.emailAttempted,
          emailSent: emailResult.emailSent,
          emailDebugReason: emailResult.emailDebugReason,
        });
      } catch (error) {
        console.error("[auction.bid] bid emails failed", {
          auctionEventId: result.auction_event_id,
          bidId: result.bid_id,
          message: error instanceof Error ? error.message : "Unknown bid email failure",
        });
      }
    }

    return NextResponse.json({
      success: true,
      code: "bid_accepted",
      auctionEventId: result.auction_event_id,
      bidId: result.bid_id,
      currentEffectiveBid: result.current_effective_bid,
      auctionEndTime: result.auction_end_time,
      minimumNextValidBid: result.minimum_next_valid_bid,
    });
  } catch (error) {
    console.error("[auction.bid] request failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { success: false, code: "temporary_error", message: TEMPORARY_ERROR_MESSAGE },
      { status: 500 },
    );
  }
}
