import Image from "next/image";
import Link from "next/link";
import { products, pick, type Product } from "@/src/data/products";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type HomePageProps = {
  lang: Locale;
  dict: Dictionary;
};

const findByKind = (kind: Product["kind"]) =>
  products.find((product) => product.kind === kind);

const hasSignatureOption = (product: Product) =>
  typeof product.options.signature === "number";

export const HomePage = ({ lang, dict }: HomePageProps) => {
  const paintings = products
    .filter((product) => product.kind === "paintings")
    .slice(0, 5);
  const featuredPainting = paintings[0] ?? null;
  const paintingThumbs = paintings.slice(1, 4);
  const mobilePaintingTiles = featuredPainting
    ? [featuredPainting, ...paintingThumbs].slice(0, 4)
    : [];

  const cardsProduct = findByKind("cards");
  const bookmarksProduct =
    products.find(
      (product) => product.kind === "bookmarks" && product.slug === "bookmarks-collection-3",
    ) ?? findByKind("bookmarks");
  const calendarsProduct =
    products.find(
      (product) => product.kind === "calendars" && product.slug === "calendar-set-2026",
    ) ?? findByKind("calendars");

  const quickShopTiles = [
    {
      key: "cards",
      kind: "cards" as const,
      product: cardsProduct,
      titleKey: "home.gifts.cards",
    },
    {
      key: "bookmarks",
      kind: "bookmarks" as const,
      product: bookmarksProduct,
      titleKey: "home.gifts.bookmarks",
    },
    {
      key: "calendars",
      kind: "calendars" as const,
      product: calendarsProduct,
      titleKey: "home.gifts.calendars",
    },
  ].flatMap((tile) =>
    tile.product ? [{ ...tile, product: tile.product }] : [],
  );

  return (
    <main className="min-h-screen bg-[#f8f6f2] px-5 pb-24 pt-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-start">
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl">
              {t(dict, "home.hero.title")}
            </h1>
            <p className="max-w-2xl text-base text-black/60">
              {t(dict, "home.hero.subtitle")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/${lang}/catalogue`}
                scroll
                className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
              >
                {t(dict, "home.hero.ctaPaintings")}
              </Link>
              <Link
                href={`/${lang}/catalogue`}
                scroll
                className="rounded-full border border-black px-6 py-3 text-sm font-semibold text-black transition hover:bg-black hover:text-white"
              >
                {t(dict, "home.hero.ctaCatalogue")}
              </Link>
            </div>
            {mobilePaintingTiles.length > 0 ? (
              <div className="lg:hidden">
                <div className="grid grid-cols-4 gap-2">
                  {mobilePaintingTiles.map((painting) => (
                    <Link
                      key={`mobile-${painting.id}`}
                      href={`/${lang}/product/${painting.slug}`}
                      scroll
                      className="block overflow-hidden rounded-xl border border-black/10 bg-white"
                    >
                      <div className="relative aspect-[4/5] w-full bg-[#f5efe7]">
                        <Image
                          src={painting.image}
                          alt={pick(painting.name, lang)}
                          fill
                          sizes="(max-width: 640px) 25vw, 120px"
                          className="object-contain p-1"
                        />
                        {painting.paintings?.auction ? (
                          <span className="absolute left-1 top-1 rounded-full border border-[#f4ece2]/35 bg-[#2d241b]/92 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.12em] text-[#f8f4ee] shadow-[0_3px_10px_rgba(0,0,0,0.35)]">
                            {t(dict, "auction.badge")}
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            {quickShopTiles.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {quickShopTiles.map((tile) => (
                  <Link
                    key={tile.key}
                    href={`/${lang}/catalogue?type=${tile.kind}`}
                    scroll
                    className="min-w-0 rounded-xl border border-black/10 bg-white p-2 transition hover:border-black/20 sm:rounded-2xl sm:p-3"
                  >
                    <div className="relative h-20 w-full overflow-hidden rounded-lg border border-black/10 bg-[#f5efe7] sm:h-28 sm:rounded-xl">
                      <Image
                        src={tile.product.image}
                        alt={pick(tile.product.name, lang)}
                        fill
                        sizes="(max-width: 640px) 33vw, 24vw"
                        className="object-contain p-2"
                      />
                      {hasSignatureOption(tile.product) ? (
                        <span className="absolute left-1.5 top-1.5 rounded-full border border-black/20 bg-white/95 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.12em] text-black/75 shadow-[0_2px_8px_rgba(0,0,0,0.12)] sm:left-2 sm:top-2 sm:px-2 sm:py-1 sm:text-[9px] sm:tracking-[0.16em]">
                          {t(dict, "shop.badge_with_signature")}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-black/70 sm:mt-2 sm:text-sm sm:tracking-[0.14em]">
                      {t(dict, tile.titleKey)}
                    </p>
                  </Link>
                ))}
              </div>
            ) : null}
            <div className="mt-16 rounded-3xl border border-black/10 bg-white p-6">
              <div className="max-w-3xl space-y-2">
                <p className="text-sm leading-relaxed text-black/65">
                  {t(dict, "home.bio.line1")}
                </p>
                <Link
                  href={`/${lang}/about`}
                  scroll
                  className="inline-flex text-xs font-semibold uppercase tracking-[0.2em] text-black/70 hover:text-black"
                >
                  {t(dict, "home.bio.readMore")}
                </Link>
              </div>
            </div>
          </div>

          {featuredPainting ? (
            <div className="hidden space-y-3 lg:ml-auto lg:block lg:w-full lg:max-w-[390px]">
              <Link
                href={`/${lang}/product/${featuredPainting.slug}`}
                scroll
                className="block overflow-hidden rounded-3xl border border-black/10 bg-white"
              >
                <div className="relative aspect-[4/5] w-full bg-[#f5efe7]">
                  <Image
                    src={featuredPainting.image}
                    alt={pick(featuredPainting.name, lang)}
                    fill
                    sizes="(max-width: 1024px) 100vw, 420px"
                    className="object-contain p-2"
                    priority
                  />
                  {featuredPainting.paintings?.auction ? (
                    <span className="absolute left-3 top-3 rounded-full border border-[#f4ece2]/35 bg-[#2d241b]/92 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f8f4ee] shadow-[0_4px_14px_rgba(0,0,0,0.38)]">
                      {t(dict, "auction.badge")}
                    </span>
                  ) : null}
                </div>
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-black">
                    {pick(featuredPainting.name, lang)}
                  </p>
                </div>
              </Link>
              {paintingThumbs.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {paintingThumbs.map((painting) => (
                    <Link
                      key={painting.id}
                      href={`/${lang}/product/${painting.slug}`}
                      scroll
                      className="block overflow-hidden rounded-2xl border border-black/10 bg-white"
                    >
                      <div className="relative aspect-[4/5] w-full bg-[#f5efe7]">
                        <Image
                          src={painting.image}
                          alt={pick(painting.name, lang)}
                          fill
                          sizes="(max-width: 1024px) 33vw, 170px"
                          className="object-contain p-1.5"
                        />
                        {painting.paintings?.auction ? (
                          <span className="absolute left-2 top-2 rounded-full border border-[#f4ece2]/35 bg-[#2d241b]/92 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#f8f4ee] shadow-[0_4px_14px_rgba(0,0,0,0.38)]">
                            {t(dict, "auction.badge")}
                          </span>
                        ) : null}
                      </div>
                      <div className="space-y-1 p-2">
                        <p className="truncate text-xs font-semibold text-black">
                          {pick(painting.name, lang)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="flex flex-col gap-4 rounded-3xl border border-black/10 bg-[#f2ebdf] p-8 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-black">{t(dict, "home.footerCta.title")}</h2>
          <div className="flex items-center gap-4">
            <Link
              href={`/${lang}/catalogue`}
              scroll
              className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
            >
              {t(dict, "home.footerCta.button")}
            </Link>
            <Link
              href={`/${lang}/track`}
              scroll
              className="text-xs font-semibold uppercase tracking-[0.2em] text-black/70 hover:text-black"
            >
              {t(dict, "home.footerCta.track")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
};
