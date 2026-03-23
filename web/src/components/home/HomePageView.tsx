import { ArtistLinks } from "@/src/components/ArtistLinks";
import Link from "next/link";
import { HomeCategoryCarousel } from "@/src/components/home/HomeCategoryCarousel";
import { HomeMediaRail } from "@/src/components/home/HomeMediaRail";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import { getCategoryImageUrls } from "@/src/lib/categoryImages";
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

const DEFAULT_HERO_BANNER_URL =
  "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/pillows.png";

export const HomePageView = ({ lang, dict, products, mediaCards }: HomePageViewProps) => {
  const groupedProducts = groupCatalogueProductsByCategory(products, lang);
  const heroCategorySlug = groupedProducts[0]?.category.slug ?? null;
  const heroCategoryImages = getCategoryImageUrls(heroCategorySlug);
  const heroDesktopImageUrl =
    heroCategoryImages.heroDesktopUrl ??
    heroCategoryImages.heroMobileUrl ??
    DEFAULT_HERO_BANNER_URL;
  const heroMobileImageUrl =
    heroCategoryImages.heroMobileUrl ??
    heroCategoryImages.heroDesktopUrl ??
    DEFAULT_HERO_BANNER_URL;
  const bannerCategoryLabel = groupedProducts[0]
    ? getCatalogueCategoryListLabel({
        category: groupedProducts[0].category,
        subtypeCode: groupedProducts[0].subtypeCode,
        lang,
      })
    : null;
  const homepageCategoryGroups = [...groupedProducts].sort((left, right) => {
    if (left.category.slug === "works" && right.category.slug !== "works") {
      return -1;
    }

    if (right.category.slug === "works" && left.category.slug !== "works") {
      return 1;
    }

    return 0;
  });
  const categoryItems = homepageCategoryGroups.slice(1).map((group) => {
    const leadProduct = group.products[0];
    const categoryImages = getCategoryImageUrls(group.category.slug);

    return {
      key: group.key,
      href: buildCatalogueCategorySectionHref(lang, group.filterValue),
      label: getCatalogueCategoryListLabel({
        category: group.category,
        subtypeCode: group.subtypeCode,
        lang,
      }),
      imageUrl: categoryImages.cardImageUrl ?? leadProduct?.cardImage ?? leadProduct?.mainImage ?? null,
    };
  });

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 pb-10 pt-4 sm:px-6 sm:gap-8 sm:pb-14 sm:pt-6 md:gap-10 md:pb-16">
      <Link
        href={`/${lang}/catalogue#${CATALOGUE_TOP_ANCHOR}`}
        className="group relative block overflow-hidden rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface)]"
      >
        <div className="relative aspect-[16/9.8] sm:aspect-[16/8] lg:aspect-[16/5.8]">
          <picture>
            <source media="(min-width: 1024px)" srcSet={heroDesktopImageUrl} />
            <img
              src={heroMobileImageUrl}
              alt={t(dict, "seo.home.heroAlt")}
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.015]"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(18,16,14,0.38)] via-[rgba(18,16,14,0.14)] via-[28%] to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[rgba(18,16,14,0.28)] via-[rgba(18,16,14,0.10)] to-transparent sm:hidden" />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-6 pt-12 sm:px-6 sm:pb-6">
            <div className="space-y-2">
              <p className="ui-overline text-white/78">
                {t(dict, "home.banner.eyebrow")}
              </p>
              {bannerCategoryLabel ? (
                <h1 className="font-display max-w-[7ch] text-[31px] font-bold leading-[1.04] tracking-[-0.025em] text-white sm:max-w-[8ch] sm:text-[48px] sm:leading-[1.02]">
                  {bannerCategoryLabel}
                </h1>
              ) : null}
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
        <div className="ui-card-md px-5 py-6 text-sm leading-7 text-[color:var(--text-muted)]">
          {t(dict, "home.hero.fallback")}
        </div>
      )}

      <div className="space-y-6 md:space-y-7">
        <section className="border-t border-[var(--border-soft)] pt-5 md:pt-6">
          <div className="max-w-3xl space-y-4">
            <p className="ui-overline">
              {t(dict, "home.aboutArtiani.kicker")}
            </p>
            <h2 className="font-display max-w-[15ch] text-[1.875rem] font-bold leading-[1.1] tracking-[-0.022em] text-[color:var(--text-strong)] sm:max-w-[16ch] sm:text-[2.5rem] sm:leading-[1.08]">
              {t(dict, "home.aboutArtiani.title")}
            </h2>
            <p className="max-w-[42rem] text-base leading-[1.7] text-[color:var(--text-body)] sm:text-lg">
              {t(dict, "home.aboutArtiani.body")}
            </p>
            <ArtistLinks
              dict={dict}
              className="pt-1.5"
              titleClassName="text-[color:var(--text-muted)]"
              linksClassName="gap-x-4 gap-y-2"
              linkClassName="text-[color:var(--text-body)]"
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
