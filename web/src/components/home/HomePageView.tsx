import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import type {
  CatalogueProduct,
} from "@/src/lib/catalogueModels";
import {
  CATALOGUE_GROUP_ORDER,
  CATALOGUE_TOP_ANCHOR,
  getCatalogueSectionAnchor,
  getCatalogueSectionLabelKey,
  getCatalogueVisibleFilter,
} from "@/src/lib/catalogueModels";

type HomePageViewProps = {
  lang: Locale;
  dict: Dictionary;
  products: CatalogueProduct[];
};

const HERO_BANNER_URL =
  "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/pillows.png";

export const HomePageView = ({ lang, dict, products }: HomePageViewProps) => {
  const groupedProducts = CATALOGUE_GROUP_ORDER.map((key) => ({
    key,
    products: products.filter((product) => getCatalogueVisibleFilter(product.productType) === key),
  })).filter((group) => group.products.length > 0);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-10 pt-4 sm:px-6 sm:pb-14 sm:pt-6 md:gap-8 md:pb-16">
      <Link
        href={`/${lang}/catalogue#${CATALOGUE_TOP_ANCHOR}`}
        className="group relative block overflow-hidden rounded-[2rem] border border-black/8 bg-white/80"
      >
        <div className="relative aspect-[16/9.8] sm:aspect-[16/8] lg:aspect-[16/5.8]">
          <Image
            src={HERO_BANNER_URL}
            alt={t(dict, "site.title")}
            fill
            priority
            className="object-cover transition duration-500 group-hover:scale-[1.015]"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(20,18,16,0.36)] via-[rgba(20,18,16,0.08)] to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-12 sm:px-6 sm:pb-6">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/78">
                {t(dict, "home.banner.eyebrow")}
              </p>
              <h1 className="max-w-[16rem] text-2xl font-semibold tracking-tight text-white sm:max-w-[24rem] sm:text-4xl">
                {t(dict, "home.banner.cta")}
              </h1>
            </div>
          </div>
        </div>
      </Link>

      <div className="overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <nav className="flex snap-x snap-mandatory gap-3">
          {groupedProducts.map((group) => {
            const leadProduct = group.products[0];
            const imageUrl = leadProduct?.cardImage ?? leadProduct?.mainImage ?? null;

            return (
            <Link
              key={group.key}
              href={`/${lang}/catalogue#${getCatalogueSectionAnchor(group.key)}`}
              className="group block min-w-[11rem] shrink-0 snap-start overflow-hidden rounded-[1.5rem] border border-black/8 bg-white/82 transition-colors hover:bg-white sm:min-w-[12.5rem] lg:min-w-0 lg:flex-1"
            >
              <div className="relative aspect-[4/4.8] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(243,238,230,0.88))]">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={t(dict, getCatalogueSectionLabelKey(group.key))}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 44vw, (max-width: 1024px) 22vw, 18vw"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(20,18,16,0.48)] via-[rgba(20,18,16,0.08)] to-transparent" />
                <div className="absolute inset-x-0 bottom-0 px-3.5 pb-3.5 pt-10 sm:px-4 sm:pb-4">
                  <p className="text-sm font-semibold tracking-tight text-white sm:text-base">
                    {t(dict, getCatalogueSectionLabelKey(group.key))}
                  </p>
                </div>
              </div>
            </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-5 md:space-y-6">
        <section className="border-t border-black/8 pt-5 md:pt-6">
          <div className="max-w-3xl space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/42">
              {t(dict, "home.aboutArtiani.kicker")}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-black sm:text-[2rem]">
              {t(dict, "home.aboutArtiani.title")}
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-black/66 sm:text-base">
              {t(dict, "home.aboutArtiani.body")}
            </p>
          </div>
        </section>

        <section className="border-t border-black/8 pt-5 md:pt-6">
          <div className="max-w-3xl space-y-3">
            <div className="space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/42">
                {t(dict, "home.aboutArtist.kicker")}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-black sm:text-[2rem]">
                {t(dict, "home.aboutArtist.title")}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-black/66 sm:text-base">
                {t(dict, "home.aboutArtist.body")}
              </p>
            </div>

            <div>
              <Link
                href={`/${lang}/biography`}
                className="inline-flex items-center justify-center rounded-full border border-black/12 bg-white/82 px-4 py-2.5 text-sm font-medium text-black/78 transition-colors hover:bg-white"
              >
                {t(dict, "home.aboutArtist.cta")}
              </Link>
            </div>
          </div>
        </section>
      </div>

    </section>
  );
};
