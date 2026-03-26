import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import { defaultLocale, isLocale, type Locale } from "@/src/i18n/locales";
import { getAdminSessionCookieName, verifyAdminSessionToken } from "@/src/lib/adminSession";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";

type AuctionEventRow = {
  id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  starting_bid: number | null;
  minimum_increment: number | null;
  product_id: string;
  products:
    | {
        slug: string;
        product_translations: Array<{ lang: string | null; title: string | null }>;
      }
    | {
        slug: string;
        product_translations: Array<{ lang: string | null; title: string | null }>;
      }[]
    | null;
};

type AuctionBidRow = {
  id: string;
  bidder_email: string;
  eligible_order_code: string;
  bid_amount: number | string;
  created_at: string;
};

const resolveAdminLocale = async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  return cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;
};

const formatAdminDate = (value: string, locale: Locale) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "ka" ? "ka-GE" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const asNumber = (value: number | string | null | undefined) => {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const pickAuctionTitle = (
  translations: Array<{ lang: string | null; title: string | null }> | null | undefined,
  locale: Locale,
  fallback: string,
) => {
  const rows = translations ?? [];
  const preferred =
    rows.find((translation) => translation.lang === locale && translation.title?.trim()) ??
    rows.find((translation) => translation.lang === "en" && translation.title?.trim()) ??
    rows.find((translation) => translation.title?.trim());

  return preferred?.title?.trim() ?? fallback;
};

export default async function AdminDashboardPage() {
  const [cookieStore, locale] = await Promise.all([cookies(), resolveAdminLocale()]);
  const hasSession = await verifyAdminSessionToken(
    cookieStore.get(getAdminSessionCookieName())?.value,
  );

  if (!hasSession) {
    redirect("/admin");
  }

  const dict = await getDictionary(locale);
  const supabase = getSupabaseAdmin();

  const { data: eventRows, error: eventsError } = await supabase
    .from("auction_events")
    .select(
      "id, status, starts_at, ends_at, starting_bid, minimum_increment, product_id, products(slug, product_translations(lang, title))",
    )
    .order("starts_at", { ascending: false });

  if (eventsError) {
    throw new Error(`[admin.dashboard] Failed to fetch auction events: ${eventsError.message}`);
  }

  const auctions = await Promise.all(
    ((eventRows ?? []) as AuctionEventRow[]).map(async (event) => {
      const product = Array.isArray(event.products) ? event.products[0] ?? null : event.products;
      const title = pickAuctionTitle(product?.product_translations, locale, product?.slug ?? event.product_id);

      const [{ count, error: countError }, { data: latestBidRows, error: latestBidsError }] = await Promise.all([
        supabase
          .from("auction_bids")
          .select("id", { count: "exact", head: true })
          .eq("auction_event_id", event.id),
        supabase
          .from("auction_bids")
          .select("id, bidder_email, eligible_order_code, bid_amount, created_at")
          .eq("auction_event_id", event.id)
          .order("bid_amount", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (countError) {
        throw new Error(`[admin.dashboard] Failed to count auction bids: ${countError.message}`);
      }

      if (latestBidsError) {
        throw new Error(`[admin.dashboard] Failed to fetch latest auction bids: ${latestBidsError.message}`);
      }

      const latestBids = (latestBidRows ?? []) as AuctionBidRow[];
      const highestBid = latestBids.reduce<number | null>((highest, bid) => {
        const amount = asNumber(bid.bid_amount);
        return highest === null || amount > highest ? amount : highest;
      }, null);

      return {
        id: event.id,
        status: event.status,
        startsAt: event.starts_at,
        endsAt: event.ends_at,
        startingBid: asNumber(event.starting_bid),
        minimumIncrement: asNumber(event.minimum_increment),
        productSlug: product?.slug ?? event.product_id,
        productTitle: title,
        bidCount: count ?? 0,
        currentHighestBid: highestBid,
        latestBids,
      };
    }),
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <div className="ui-card border border-[var(--border-soft)] px-6 py-7 sm:px-7 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="ui-overline">{t(dict, "admin.dashboard.kicker")}</p>
              <h1 className="font-display text-[2rem] leading-tight text-[color:var(--text-strong)]">
                {t(dict, "admin.dashboard.title")}
              </h1>
              <p className="text-sm leading-7 text-[color:var(--text-body)]">
                {t(dict, "admin.dashboard.body")}
              </p>
            </div>
            <form action="/api/admin/logout" method="post">
              <div className="flex gap-3">
                <Link href="/admin/orders" className="ui-button-secondary whitespace-nowrap">
                  {t(dict, "admin.dashboard.ordersLink")}
                </Link>
                <button type="submit" className="ui-button-secondary whitespace-nowrap">
                  {t(dict, "admin.dashboard.logout")}
                </button>
              </div>
            </form>
          </div>
        </div>

        <section className="ui-card border border-[var(--border-soft)] px-6 py-7 sm:px-7 sm:py-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="ui-overline">{t(dict, "admin.dashboard.auctionsKicker")}</p>
              <h2 className="font-display text-[1.5rem] leading-tight text-[color:var(--text-strong)]">
                {t(dict, "admin.dashboard.auctionsTitle")}
              </h2>
              <p className="text-sm leading-7 text-[color:var(--text-body)]">
                {t(dict, "admin.dashboard.auctionsBody")}
              </p>
            </div>

            {auctions.length > 0 ? (
              <div className="space-y-4">
                {auctions.map((auction) => (
                  <div key={auction.id} className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1.5">
                        <p className="font-medium text-[color:var(--text-strong)]">{auction.productTitle}</p>
                        <p className="text-sm leading-6 text-[color:var(--text-muted)]">{auction.productSlug}</p>
                      </div>
                      <span className="rounded-full bg-[#f5efe6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-strong)]">
                        {t(dict, `productDetail.auctionStatus.${auction.status}`)}
                      </span>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm text-[color:var(--text-body)] sm:grid-cols-2">
                      <div>
                        <dt className="text-[13px] leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.dashboard.auctionStartsAt")}</dt>
                        <dd>{formatAdminDate(auction.startsAt, locale)}</dd>
                      </div>
                      <div>
                        <dt className="text-[13px] leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.dashboard.auctionEndsAt")}</dt>
                        <dd>{formatAdminDate(auction.endsAt, locale)}</dd>
                      </div>
                      <div>
                        <dt className="text-[13px] leading-6 text-[color:var(--text-muted)]">{t(dict, "productDetail.auctionStartingBidLabel")}</dt>
                        <dd>{auction.startingBid} ₾</dd>
                      </div>
                      <div>
                        <dt className="text-[13px] leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.dashboard.auctionCurrentHighestBid")}</dt>
                        <dd>{auction.currentHighestBid ?? auction.startingBid} ₾</dd>
                      </div>
                      <div>
                        <dt className="text-[13px] leading-6 text-[color:var(--text-muted)]">{t(dict, "productDetail.auctionMinimumIncrementLabel")}</dt>
                        <dd>{auction.minimumIncrement} ₾</dd>
                      </div>
                      <div>
                        <dt className="text-[13px] leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.dashboard.auctionBidCount")}</dt>
                        <dd>{auction.bidCount}</dd>
                      </div>
                    </dl>

                    <div className="mt-4 space-y-2">
                      <p className="ui-overline">{t(dict, "admin.dashboard.auctionLatestBids")}</p>
                      {auction.latestBids.length > 0 ? (
                        <div className="space-y-2">
                          {auction.latestBids.map((bid) => (
                            <div key={bid.id} className="flex flex-col gap-1 rounded-[0.85rem] bg-[#f8f5ef] px-3 py-3 text-sm text-[color:var(--text-body)] sm:flex-row sm:items-center sm:justify-between">
                              <div className="space-y-0.5">
                                <p>{bid.bidder_email}</p>
                                <p className="text-[color:var(--text-muted)]">
                                  {t(dict, "admin.dashboard.auctionOrderCode")}: {bid.eligible_order_code}
                                </p>
                              </div>
                              <div className="space-y-0.5 text-left sm:text-right">
                                <p className="font-medium text-[color:var(--text-strong)]">{asNumber(bid.bid_amount)} ₾</p>
                                <p className="text-[color:var(--text-muted)]">{formatAdminDate(bid.created_at, locale)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                          {t(dict, "admin.dashboard.auctionLatestBidsEmpty")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                {t(dict, "admin.dashboard.auctionsEmpty")}
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
