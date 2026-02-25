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

export const HomePage = ({ lang, dict }: HomePageProps) => {
  const paintings = products
    .filter((product) => product.kind === "paintings")
    .slice(0, 5);
  const featuredPainting = paintings[0] ?? null;
  const paintingThumbs = paintings.slice(1, 4);

  const cardsProduct = findByKind("cards");
  const bookmarksProduct = findByKind("bookmarks");
  const calendarsProduct = findByKind("calendars");

  const giftTiles = [
    { kind: "cards" as const, product: cardsProduct, titleKey: "home.gifts.cards" },
    {
      kind: "bookmarks" as const,
      product: bookmarksProduct,
      titleKey: "home.gifts.bookmarks",
    },
    {
      kind: "calendars" as const,
      product: calendarsProduct,
      titleKey: "home.gifts.calendars",
    },
  ].flatMap((tile) =>
    tile.product ? [{ ...tile, product: tile.product }] : [],
  );

  const bundleTiles = [
    {
      id: "studio",
      titleKey: "home.bundles.tileStudio",
      items: [cardsProduct, bookmarksProduct, calendarsProduct].filter(
        (item): item is Product => Boolean(item),
      ),
    },
    {
      id: "gift",
      titleKey: "home.bundles.tileGift",
      items: [paintings[0], cardsProduct, calendarsProduct].filter(
        (item): item is Product => Boolean(item),
      ),
    },
    {
      id: "collector",
      titleKey: "home.bundles.tileCollector",
      items: [paintings[1] ?? paintings[0], bookmarksProduct, cardsProduct].filter(
        (item): item is Product => Boolean(item),
      ),
    },
  ].filter((bundle) => bundle.items.length === 3);

  return (
    <main className="min-h-screen bg-[#f8f6f2] px-5 pb-24 pt-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:items-start">
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl">
              {t(dict, "home.hero.title")}
            </h1>
            <p className="max-w-2xl text-base text-black/60">
              {t(dict, "home.hero.subtitle")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/${lang}#featured-originals`}
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
          </div>

          {featuredPainting ? (
            <div className="space-y-3">
              <Link
                href={`/${lang}/product/${featuredPainting.slug}`}
                scroll
                className="block overflow-hidden rounded-3xl border border-black/10 bg-white"
              >
                <div className="relative aspect-[4/5] w-full">
                  <Image
                    src={featuredPainting.image}
                    alt={pick(featuredPainting.name, lang)}
                    fill
                    sizes="(max-width: 1024px) 100vw, 520px"
                    className="object-cover"
                    priority
                  />
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
                      <div className="relative aspect-[4/5] w-full">
                        <Image
                          src={painting.image}
                          alt={pick(painting.name, lang)}
                          fill
                          sizes="(max-width: 1024px) 33vw, 170px"
                          className="object-cover"
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section id="featured-originals" className="space-y-6 scroll-mt-28">
          <div className="flex items-end justify-between gap-6">
            <h2 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">
              {t(dict, "home.featured.title")}
            </h2>
            <Link
              href={`/${lang}/catalogue`}
              scroll
              className="text-sm font-semibold text-black/70 hover:text-black"
            >
              {t(dict, "home.featured.cta")}
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {paintings.map((painting) => (
              <Link
                key={painting.id}
                href={`/${lang}/product/${painting.slug}`}
                scroll
                className="group rounded-3xl border border-black/10 bg-white p-4 transition hover:-translate-y-1"
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-black/10">
                  <Image
                    src={painting.image}
                    alt={pick(painting.name, lang)}
                    fill
                    sizes="(max-width: 1280px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-black">
                      {pick(painting.name, lang)}
                    </h3>
                    {painting.paintings?.auction ? (
                      <span className="rounded-full border border-black/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/60">
                        {t(dict, "auction.badge")}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-black/60">{pick(painting.summary, lang)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-end justify-between gap-6">
            <h2 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">
              {t(dict, "home.gifts.title")}
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {giftTiles.map((tile) => (
              <div
                key={tile.kind}
                className="rounded-3xl border border-black/10 bg-white p-4"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-black/10">
                  <Image
                    src={tile.product.image}
                    alt={pick(tile.product.name, lang)}
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="mt-4 space-y-2">
                  <h3 className="text-lg font-semibold text-black">{t(dict, tile.titleKey)}</h3>
                  <p className="text-sm text-black/60">{pick(tile.product.summary, lang)}</p>
                  <Link
                    href={`/${lang}/catalogue`}
                    scroll
                    className="inline-flex text-xs font-semibold uppercase tracking-[0.2em] text-black/70 hover:text-black"
                  >
                    {t(dict, "home.gifts.cta")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">
              {t(dict, "home.bundles.title")}
            </h2>
            <p className="text-sm text-black/60">{t(dict, "home.bundles.subtitle")}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {bundleTiles.map((bundle) => (
              <div
                key={bundle.id}
                className="rounded-3xl border border-black/10 bg-white p-4"
              >
                <div className="grid grid-cols-3 gap-2">
                  {bundle.items.map((item) => (
                    <div
                      key={`${bundle.id}-${item.id}`}
                      className="relative aspect-square overflow-hidden rounded-xl border border-black/10"
                    >
                      <Image
                        src={item.image}
                        alt={pick(item.name, lang)}
                        fill
                        sizes="(max-width: 1024px) 33vw, 120px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <h3 className="text-base font-semibold text-black">
                    {t(dict, bundle.titleKey)}
                  </h3>
                  <p className="text-sm text-black/60">{t(dict, "home.bundles.subtitle")}</p>
                  <Link
                    href={`/${lang}/catalogue`}
                    scroll
                    className="inline-flex text-xs font-semibold uppercase tracking-[0.2em] text-black/70 hover:text-black"
                  >
                    {t(dict, "home.bundles.cta")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-black/10 bg-white p-8">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50">
              {t(dict, "home.about.title")}
            </p>
            <p className="text-sm leading-relaxed text-black/60">{t(dict, "home.about.body")}</p>
            <Link
              href={`/${lang}/about`}
              scroll
              className="inline-flex text-xs font-semibold uppercase tracking-[0.2em] text-black/70 hover:text-black"
            >
              {t(dict, "home.about.cta")}
            </Link>
          </div>
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
