import { ArtistLinks } from "@/src/components/ArtistLinks";
import Image from "next/image";
import Link from "next/link";
import { HomeCategoryCarousel } from "@/src/components/home/HomeCategoryCarousel";
import { HomeMediaRail } from "@/src/components/home/HomeMediaRail";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import type { ArtistMediaCard } from "@/src/lib/mediaCards";
import {
  CATALOGUE_TOP_ANCHOR,
  buildCatalogueCategorySectionHref,
  getCatalogueCategoryListLabel,
  groupCatalogueProductsByCategory,
  type CatalogueProduct,
} from "@/src/lib/catalogueModels";

type HomePageViewProps = {
  lang: Locale;
  dict: Dictionary;
  products: CatalogueProduct[];
  mediaCards: ArtistMediaCard[];
};

const HERO_BANNER_URL =
  "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/pillows.png";

export const HomePageView = ({ lang, dict, products, mediaCards }: HomePageViewProps) => {
  const groupedProducts = groupCatalogueProductsByCategory(products, lang);
  const bannerCategoryLabel = groupedProducts[0]
    ? getCatalogueCategoryListLabel({
        category: groupedProducts[0].category,
        subtypeCode: groupedProducts[0].subtypeCode,
        lang,
      })
    : null;
  const categoryItems = groupedProducts.map((group) => {
    const leadProduct = group.products[0];

    return {
      key: group.key,
      href: buildCatalogueCategorySectionHref(lang, group.filterValue),
      label: getCatalogueCategoryListLabel({
        category: group.category,
        subtypeCode: group.subtypeCode,
        lang,
      }),
      imageUrl: leadProduct?.cardImage ?? leadProduct?.mainImage ?? null,
    };
  });

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 pb-10 pt-4 sm:px-6 sm:gap-8 sm:pb-14 sm:pt-6 md:gap-10 md:pb-16">
      <Link
        href={`/${lang}/catalogue#${CATALOGUE_TOP_ANCHOR}`}
        className="group relative block overflow-hidden rounded-[2rem] border border-black/8 bg-white/80"
      >
        <div className="relative aspect-[16/9.8] sm:aspect-[16/8] lg:aspect-[16/5.8]">
          <Image
            src={HERO_BANNER_URL}
            alt={t(dict, "seo.home.heroAlt")}
            fill
            priority
            className="object-cover transition duration-500 group-hover:scale-[1.015]"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(20,18,16,0.28)] via-[rgba(20,18,16,0.06)] to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-12 sm:px-6 sm:pb-6">
            <div className="flex items-end justify-between gap-6">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/78">
                  {t(dict, "home.banner.eyebrow")}
                </p>
                {bannerCategoryLabel ? (
                  <h1 className="max-w-[16rem] text-2xl font-semibold tracking-tight text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.22)] sm:max-w-[24rem] sm:text-4xl">
                    {bannerCategoryLabel}
                  </h1>
                ) : null}
              </div>
              <p className="max-w-[12rem] text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-[#f5e6c8] [text-shadow:0_1px_8px_rgba(0,0,0,0.28)] sm:max-w-[16rem] sm:text-[10.5px]">
                {t(dict, "footer.designedBy").replace("G. Margiani", "\u00A0G.\u00A0Margiani")}
              </p>
            </div>
          </div>
        </div>
      </Link>

      {categoryItems.length > 0 ? (
        <HomeCategoryCarousel
          items={categoryItems}
          previousLabel={t(dict, "home.categoryCarousel.previous")}
          nextLabel={t(dict, "home.categoryCarousel.next")}
        />
      ) : (
        <div className="rounded-[1.5rem] bg-black/[0.04] px-5 py-6 text-sm leading-7 text-black/60">
          {t(dict, "home.hero.fallback")}
        </div>
      )}

      <div className="space-y-6 md:space-y-7">
        <section className="border-t border-black/8 pt-5 md:pt-6">
          <div className="max-w-3xl space-y-3">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-black/38">
              {t(dict, "home.aboutArtiani.kicker")}
            </p>
            <h2 className="max-w-[16ch] text-2xl font-semibold leading-[1.08] tracking-[-0.02em] text-black sm:max-w-[17ch] sm:text-[2rem]">
              {t(dict, "home.aboutArtiani.title")}
            </h2>
            <p className="max-w-[42rem] text-sm leading-[1.95] text-black/62 sm:text-base sm:leading-[2]">
              {t(dict, "home.aboutArtiani.body")}
            </p>
            <ArtistLinks
              dict={dict}
              className="pt-1.5"
              titleClassName="text-black/42"
              linksClassName="gap-x-4 gap-y-2"
              linkClassName="text-black/62"
            />
          </div>
        </section>

        <HomeMediaRail
          cards={mediaCards}
          labels={{
            kicker: t(dict, "home.media.kicker"),
            title: t(dict, "home.media.title"),
            empty: t(dict, "home.media.empty"),
            previous: t(dict, "home.media.previous"),
            next: t(dict, "home.media.next"),
            play: t(dict, "home.media.play"),
            open: t(dict, "home.media.open"),
            typeLabels: {
              youtube_video: t(dict, "home.media.types.youtube_video"),
              facebook_post: t(dict, "home.media.types.facebook_post"),
              exhibition: t(dict, "home.media.types.exhibition"),
              article: t(dict, "home.media.types.article"),
              site_link: t(dict, "home.media.types.site_link"),
            },
          }}
        />
      </div>

    </section>
  );
};
