import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import type {
  CatalogueProduct,
  CatalogueVisibleFilter,
} from "@/src/lib/catalogueModels";
import { getCatalogueTypeLabelKey, getCatalogueVisibleFilter } from "@/src/lib/catalogueModels";

type HomePageViewProps = {
  lang: Locale;
  dict: Dictionary;
  products: CatalogueProduct[];
};

const categoryOrder: CatalogueVisibleFilter[] = ["cloths", "runners", "pillows", "scarves"];

const pickFeaturedProducts = (products: CatalogueProduct[], limit = 4) => {
  const picks: CatalogueProduct[] = [];

  for (const filter of categoryOrder) {
    const match = products.find((product) => getCatalogueVisibleFilter(product.productType) === filter);
    if (match && !picks.some((picked) => picked.id === match.id)) {
      picks.push(match);
    }
  }

  for (const product of products) {
    if (picks.length >= limit) break;
    if (!picks.some((picked) => picked.id === product.id)) {
      picks.push(product);
    }
  }

  return picks.slice(0, limit);
};

export const HomePageView = ({ lang, dict, products }: HomePageViewProps) => {
  const featuredProducts = pickFeaturedProducts(products);
  const heroProducts = featuredProducts.slice(0, 3);
  const leadHeroProduct = heroProducts[0] ?? null;
  const trailingHeroProducts = heroProducts.slice(1);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-10 pt-4 sm:px-6 sm:pb-14 sm:pt-6 md:gap-10 md:pb-16">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-stretch">
        <div className="flex flex-col justify-between gap-8 rounded-[2rem] bg-white/76 px-5 py-6 sm:px-7 sm:py-7">
          <div className="space-y-7">
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/42">
                {t(dict, "home.hero.kicker")}
              </p>
              <h1 className="text-[3.2rem] font-semibold tracking-[-0.05em] text-black sm:text-[4.75rem] sm:leading-[0.95]">
                {t(dict, "site.title")}
              </h1>
              <p className="max-w-xl text-sm leading-7 text-black/68 sm:text-base">
                {t(dict, "home.hero.body")}
              </p>
            </div>

            <div className="space-y-2.5 border-t border-black/8 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/42">
                {t(dict, "home.artist.kicker")}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-black sm:text-[2rem]">
                {t(dict, "home.artist.title")}
              </h2>
              <p className="max-w-xl text-sm leading-7 text-black/66 sm:text-base">
                {t(dict, "home.artist.body")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/${lang}/biography`}
              className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-medium !text-white transition-colors hover:bg-black/90"
            >
              {t(dict, "nav.biography")}
            </Link>
            <Link
              href={`/${lang}/catalogue`}
              className="inline-flex items-center justify-center rounded-full border border-black/12 bg-white/72 px-5 py-3 text-sm font-medium text-black/76 transition-colors hover:bg-white"
            >
              {t(dict, "nav.catalogue")}
            </Link>
          </div>
        </div>

        {leadHeroProduct ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href={`/${lang}/product/${leadHeroProduct.slug}`}
              className="group relative overflow-hidden rounded-[2rem] border border-black/8 bg-white/82 sm:col-span-2"
            >
              <div className="relative aspect-[4/3] bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(245,241,233,0.8))]">
                {leadHeroProduct.mainImage ?? leadHeroProduct.cardImage ? (
                  <Image
                    src={leadHeroProduct.mainImage ?? leadHeroProduct.cardImage ?? ""}
                    alt={leadHeroProduct.title}
                    fill
                    className="object-contain p-4 transition duration-500 group-hover:scale-[1.015] sm:p-5"
                    sizes="(max-width: 1024px) 100vw, 42vw"
                  />
                ) : null}
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-white via-white/88 to-transparent px-5 pb-5 pt-12">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
                    {t(dict, "home.hero.featuredLabel")}
                  </p>
                  <h2 className="text-xl font-semibold tracking-tight text-black sm:text-[1.65rem]">
                    {leadHeroProduct.title}
                  </h2>
                  <p className="text-xs uppercase tracking-[0.18em] text-black/45 sm:text-[11px]">
                    {t(dict, getCatalogueTypeLabelKey(leadHeroProduct.productType))}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm text-black/62">
                    {t(dict, "catalogue.card.pricePrefix")} {leadHeroProduct.defaultPrice} ₾
                  </p>
                </div>
              </div>
            </Link>

            {trailingHeroProducts.map((product) => (
              <Link
                key={product.id}
                href={`/${lang}/product/${product.slug}`}
                className="group overflow-hidden rounded-[1.5rem] border border-black/8 bg-white/82"
              >
                <div className="relative aspect-[4/4.4] bg-black/[0.025]">
                  {product.cardImage ?? product.mainImage ? (
                    <Image
                      src={product.cardImage ?? product.mainImage ?? ""}
                      alt={product.title}
                      fill
                      className="object-contain p-3 transition duration-300 group-hover:scale-[1.02]"
                      sizes="(max-width: 640px) 50vw, 21vw"
                    />
                  ) : null}
                </div>
                <div className="space-y-1 px-4 py-3.5">
                  <h3 className="text-base font-semibold tracking-tight text-black">
                    {product.title}
                  </h3>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-black/45">
                    {t(dict, getCatalogueTypeLabelKey(product.productType))}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[22rem] items-end rounded-[2rem] border border-black/8 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(239,234,226,0.9))] p-6">
            <p className="max-w-sm text-sm leading-7 text-black/62">
              {t(dict, "home.hero.fallback")}
            </p>
          </div>
        )}
      </section>
    </section>
  );
};
