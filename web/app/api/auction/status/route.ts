import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";

export const runtime = "nodejs";

type AuctionEventRow = {
  id: string;
  status: string;
  ends_at: string;
  starting_bid: number | null;
  minimum_increment: number | null;
};

type AuctionBidPreviewRow = {
  bid_amount: number | null;
};

const asTrimmedString = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

const resolveAuctionEvent = async ({
  supabase,
  auctionEventId,
  productSlug,
}: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  auctionEventId: string | null;
  productSlug: string | null;
}) => {
  if (auctionEventId) {
    const { data, error } = await supabase
      .from("auction_events")
      .select("id, status, ends_at, starting_bid, minimum_increment")
      .eq("id", auctionEventId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as AuctionEventRow | null) ?? null;
  }

  if (!productSlug) {
    return null;
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("slug", productSlug)
    .maybeSingle();

  if (productError) {
    throw productError;
  }

  if (!product?.id) {
    return null;
  }

  const { data, error } = await supabase
    .from("auction_events")
    .select("id, status, ends_at, starting_bid, minimum_increment")
    .eq("product_id", product.id)
    .in("status", ["scheduled", "live", "winner_pending_payment"])
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as AuctionEventRow | null) ?? null;
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const auctionEventId = asTrimmedString(url.searchParams.get("auctionEventId"));
  const productSlug = asTrimmedString(url.searchParams.get("productSlug"));

  if (!auctionEventId && !productSlug) {
    return NextResponse.json(
      { success: false, code: "invalid_payload" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  try {
    const event = await resolveAuctionEvent({
      supabase,
      auctionEventId,
      productSlug,
    });

    if (!event) {
      return NextResponse.json(
        { success: false, code: "not_found" },
        { status: 404 },
      );
    }

    const startingBid = event.starting_bid ?? 0;
    const minimumIncrement = event.minimum_increment ?? 0;

    const { data: highestBidData, error: highestBidError } = await supabase
      .from("auction_bids")
      .select("bid_amount")
      .eq("auction_event_id", event.id)
      .order("bid_amount", { ascending: false })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (highestBidError) {
      throw highestBidError;
    }

    const highestBid = (highestBidData as AuctionBidPreviewRow | null)?.bid_amount ?? null;
    const currentEffectiveBid =
      typeof highestBid === "number" && Number.isFinite(highestBid) ? highestBid : startingBid;

    return NextResponse.json({
      success: true,
      auctionEvent: {
        id: event.id,
        status: event.status,
        currentEffectiveBid,
        minimumNextValidBid: currentEffectiveBid + minimumIncrement,
        auctionEndTime: event.ends_at,
      },
    });
  } catch (error) {
    console.error("[auction.status] fetch failed", {
      auctionEventId,
      productSlug,
      ...readSupabaseErrorDetails(error),
    });

    return NextResponse.json(
      { success: false, code: "temporary_error" },
      { status: 500 },
    );
  }
}
