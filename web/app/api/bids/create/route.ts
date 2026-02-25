import { NextRequest, NextResponse } from "next/server";
import { products } from "@/src/data/products";
import { sendBidEmails } from "@/src/lib/emailBids";
import { insertWithBidCodeRetry } from "@/src/lib/orderCode";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";
import { isLocale, type Locale } from "@/src/i18n/locales";

export const runtime = "nodejs";

const GENERIC_ERROR_MESSAGE = "Unable to create bid.";
const MAX_BID_AMOUNT_CENTS = 200_011_100;

class ValidationError extends Error {}

type ParsedBidRequest = {
  lang: Locale;
  bid: {
    productSlug: string;
    fullName: string;
    email: string;
    phone: string;
    amountCents: number;
    note: string | null;
  };
};

type CreatedBidRow = {
  code: string;
  product_slug: string;
  bidder_name: string;
  bidder_email: string;
  bidder_phone: string;
  bid_amount_cents: number;
  note: string | null;
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

const readErrorCode = (error: unknown) => {
  if (!error || typeof error !== "object") return undefined;
  if ("code" in error && typeof error.code === "string") {
    return error.code;
  }
  return undefined;
};

const readErrorMessage = (error: unknown) => {
  if (!error || typeof error !== "object") return undefined;
  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }
  return undefined;
};

const isNumericOutOfRangeError = (error: unknown) => {
  const code = readErrorCode(error);
  if (code === "22003") {
    return true;
  }

  const message = readErrorMessage(error);
  return typeof message === "string"
    ? /out of range|numeric field overflow/i.test(message)
    : false;
};

const parseAmountToCents = (value: unknown) => {
  const raw =
    typeof value === "number"
      ? value.toString()
      : typeof value === "string"
        ? value.trim()
        : "";

  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    throw new ValidationError();
  }

  const [wholePart, fractionPart = ""] = raw.split(".");
  const whole = Number(wholePart);
  const fraction = Number(fractionPart.padEnd(2, "0"));

  if (!Number.isSafeInteger(whole) || !Number.isInteger(fraction)) {
    throw new ValidationError();
  }

  const amountCents = whole * 100 + fraction;

  if (
    !Number.isSafeInteger(amountCents) ||
    amountCents <= 0 ||
    amountCents > MAX_BID_AMOUNT_CENTS
  ) {
    throw new ValidationError();
  }

  return amountCents;
};

const parseBidPayload = (payload: unknown): ParsedBidRequest => {
  const root = asRecord(payload);

  const langRaw = asTrimmedString(root.lang);
  if (!langRaw || !isLocale(langRaw)) {
    throw new ValidationError();
  }

  const bidRaw = asRecord(root.bid);
  const productSlug = asTrimmedString(bidRaw.productSlug);
  const fullName = asTrimmedString(bidRaw.fullName);
  const emailRaw = asTrimmedString(bidRaw.email);
  const phone = asTrimmedString(bidRaw.phone);
  if (!productSlug || !fullName || !emailRaw || !phone) {
    throw new ValidationError();
  }

  const product = products.find(
    (item) => item.slug === productSlug && item.kind === "paintings",
  );
  if (!product) {
    throw new ValidationError();
  }

  const amountCents = parseAmountToCents(bidRaw.amount);
  const minBidCents = Math.round((product.paintings?.auction.minBidGEL ?? 0) * 100);
  if (amountCents < minBidCents) {
    throw new ValidationError();
  }
  const noteRaw =
    bidRaw.note === undefined || bidRaw.note === null
      ? null
      : asTrimmedString(bidRaw.note);

  return {
    lang: langRaw,
    bid: {
      productSlug,
      fullName,
      email: emailRaw.toLowerCase(),
      phone,
      amountCents,
      note: noteRaw && noteRaw.length > 0 ? noteRaw : null,
    },
  };
};

const badRequest = () =>
  NextResponse.json({ message: GENERIC_ERROR_MESSAGE }, { status: 400 });

const serverError = () =>
  NextResponse.json({ message: GENERIC_ERROR_MESSAGE }, { status: 500 });

export async function POST(request: NextRequest) {
  let parsed: ParsedBidRequest;
  try {
    const payload = await request.json();
    parsed = parseBidPayload(payload);
  } catch (error) {
    if (error instanceof ValidationError) {
      return badRequest();
    }
    return badRequest();
  }

  const supabase = getSupabaseAdmin();

  let bid: CreatedBidRow;
  try {
    const { result } = await insertWithBidCodeRetry(async (bidCode) => {
      const { data, error } = await supabase
        .from("bids")
        .insert({
          code: bidCode,
          product_slug: parsed.bid.productSlug,
          bidder_name: parsed.bid.fullName,
          bidder_email: parsed.bid.email,
          bidder_phone: parsed.bid.phone,
          bid_amount_cents: parsed.bid.amountCents,
          note: parsed.bid.note,
          status: "RECEIVED",
        })
        .select(
          "code, product_slug, bidder_name, bidder_email, bidder_phone, bid_amount_cents, note",
        )
        .single();

      if (error) {
        throw error;
      }

      return data as CreatedBidRow;
    });
    bid = result;
  } catch (error) {
    if (isNumericOutOfRangeError(error)) {
      return badRequest();
    }
    console.error("Bid insert failed", error);
    return serverError();
  }

  let emailSent = true;
  try {
    const emailResult = await sendBidEmails({
      bid,
      lang: parsed.lang,
    });
    emailSent = emailResult.emailSent;
  } catch (error) {
    emailSent = false;
    console.error("Bid emails failed", error);
  }

  return NextResponse.json({ code: bid.code, emailSent });
}
