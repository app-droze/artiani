import { buildMerchantCenterFeed } from "@/src/lib/merchantCenterFeed";

export const revalidate = 3600;

export async function GET() {
  const feed = await buildMerchantCenterFeed();
  const missingDataSkips = feed.skipped
    .filter((item) => item.reason !== "not_sellable")
    .map((item) => item.slug);

  return new Response(feed.xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
      "X-Artiani-Merchant-Items": String(feed.items.length),
      "X-Artiani-Merchant-Skipped": String(feed.skipped.length),
      "X-Artiani-Merchant-Skipped-Missing": missingDataSkips.join(","),
    },
  });
}
