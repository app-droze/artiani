import Link from "next/link";
import { TrustBar } from "@/src/components/TrustBar";
import { HomeCategoryCarousel } from "@/src/components/home/HomeCategoryCarousel";
import { HomeMediaRail } from "@/src/components/home/HomeMediaRail";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import { getCategoryImageUrls } from "@/src/lib/categoryImages";
import type { ArtistMediaCard } from "@/src/lib/mediaCards";
import {
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
  const homepageCategoryGroups = [...groupedProducts];
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
  const heroCta = {
    href: buildCatalogueCategorySectionHref(lang, "works"),
    label: t(dict, "home.hero.ctaOriginals"),
  };
  const heroDesktopSecondaryCta = {
    href: `/${lang}/catalogue`,
    label: t(dict, "nav.catalogue"),
  };
  const heroBody = t(dict, "home.hero.body");

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-10 pt-4 sm:px-6 sm:gap-8 sm:pb-14 sm:pt-6 md:gap-10 md:pb-16">
      <section className="overflow-hidden rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="relative aspect-[16/11] sm:aspect-[16/8.8] lg:aspect-[16/6.3]">
          <picture>
            <source media="(min-width: 1024px)" srcSet={heroDesktopImageUrl} />
            <img
              src={heroMobileImageUrl}
              alt={t(dict, "seo.home.heroAlt")}
              className="absolute inset-0 h-full w-full object-cover object-[center_42%] lg:object-[center_36%]"
            />
          </picture>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,16,14,0.14)_0%,rgba(18,16,14,0.24)_26%,rgba(18,16,14,0.52)_100%)]" />
          <div className="absolute inset-x-0 top-0 px-4 pb-6 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
            <h1 className="font-display text-[1.05rem] font-bold leading-[1.02] tracking-[-0.03em] text-white sm:text-[1.45rem] lg:text-[2rem]">
              {t(dict, "home.hero.title")}
            </h1>
          </div>
          <div className="absolute inset-x-0 bottom-0 px-4 pb-2.5 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3 gap-y-2 sm:gap-4">
              <div className="min-w-0 text-white/84">
                <p className="text-[12px] leading-5 sm:text-base sm:leading-8 lg:whitespace-nowrap">
                  {heroBody}
                </p>
              </div>
              <div className="flex max-w-[9.5rem] flex-wrap justify-end gap-2 sm:max-w-none">
                <Link
                  href={heroCta.href}
                  className="order-2 inline-flex min-h-8 items-center justify-center whitespace-nowrap rounded-full bg-[#f6efe4] px-3 py-1.5 text-[10px] font-medium text-[color:var(--text-strong)] transition-colors hover:bg-[#fbf6ee] sm:order-1 sm:min-h-11 sm:px-5 sm:py-2.5 sm:text-sm"
                >
                  {heroCta.label}
                </Link>
                <Link
                  href={heroDesktopSecondaryCta.href}
                  className="hidden min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-white/35 bg-[rgba(248,244,238,0.58)] px-5 py-2.5 text-sm font-medium text-[color:var(--text-strong)] backdrop-blur-[6px] transition-colors hover:bg-[rgba(251,246,238,0.72)] sm:inline-flex"
                >
                  {heroDesktopSecondaryCta.label}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {categoryItems.length > 0 ? (
        <>
          <section className="space-y-2 sm:hidden">
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href={`/${lang}/catalogue`}
                className="group col-span-2 flex items-center justify-between rounded-[1.15rem] border border-[var(--border-soft)] bg-[linear-gradient(135deg,#f7f1e8_0%,#efe4d4_100%)] px-4 py-4 shadow-[0_12px_24px_rgba(18,16,14,0.05)]"
              >
                <p className="text-[1rem] font-semibold leading-[1.3] text-[color:var(--text-strong)]">
                  {t(dict, "nav.catalogue")}
                </p>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/76 text-[color:var(--text-strong)] transition-transform group-hover:translate-x-0.5">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4.5 10h11" />
                    <path d="m10.5 4.5 5 5-5 5" />
                  </svg>
                </span>
              </Link>

              {categoryItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className="group relative block overflow-hidden rounded-[1.1rem] border border-[var(--border-soft)] bg-[var(--surface)]"
                >
                  <div className="relative aspect-[1/1.06]">
                    {item.imageUrl ? (
                      <>
                        <img
                          src={item.imageUrl}
                          alt={item.label}
                          className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,17,14,0.02)_0%,rgba(20,17,14,0.5)_100%)]" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-[linear-gradient(135deg,#f4ece0_0%,#e7d9c7_100%)]" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-3.5">
                      <p className="text-[0.98rem] font-semibold leading-[1.2] text-white">
                        {item.label}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <div className="hidden sm:block">
            <HomeCategoryCarousel
              items={categoryItems}
              previousLabel={t(dict, "home.categoryCarousel.previous")}
              nextLabel={t(dict, "home.categoryCarousel.next")}
            />
          </div>
        </>
      ) : (
        <div className="ui-card-md px-5 py-6 text-sm leading-7 text-[color:var(--text-muted)]">
          {t(dict, "home.hero.fallback")}
        </div>
      )}

      <TrustBar dict={dict} />

      <div className="space-y-6 md:space-y-7">
        <section className="border-t border-[var(--border-soft)] pt-5 md:pt-6">
          <div className="max-w-3xl space-y-4">
            <p className="ui-overline">
              {t(dict, "home.aboutArtiani.kicker")}
            </p>
            <h2 className="font-display max-w-[22ch] text-[1.875rem] font-bold leading-[1.1] tracking-[-0.022em] text-[color:var(--text-strong)] sm:max-w-[24ch] sm:text-[2.5rem] sm:leading-[1.08]">
              {t(dict, "home.aboutArtiani.title")}
            </h2>
            <div className="max-w-[42rem] space-y-3 text-base leading-[1.7] text-[color:var(--text-body)] sm:text-lg">
              {t(dict, "home.aboutArtiani.body")
                .split("\n\n")
                .filter(Boolean)
                .map((paragraph) => (
                  <p key={paragraph}>
                    {paragraph}
                  </p>
                ))}
            </div>
            <Link href={`/${lang}/biography`} className="ui-button-secondary w-fit">
              {t(dict, "nav.aboutArtiani")}
            </Link>
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
