import Link from "next/link";
import { ArtistLinks } from "@/src/components/ArtistLinks";
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
  const heroCtas = [
    {
      href: buildCatalogueCategorySectionHref(lang, "works"),
      label: t(dict, "home.hero.ctaOriginals"),
      primary: true,
    },
    {
      href: buildCatalogueCategorySectionHref(lang, "tablecloth"),
      label: t(dict, "home.hero.ctaTableTextiles"),
      primary: false,
    },
    {
      href: buildCatalogueCategorySectionHref(lang, "headscarf"),
      label: t(dict, "home.hero.ctaScarves"),
      primary: false,
    },
  ];
  const mobileHeroCtas = heroCtas.slice(0, 2);
  const mobileSecondaryHeroCta = heroCtas[2];

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 pb-10 pt-4 sm:px-6 sm:gap-8 sm:pb-14 sm:pt-6 md:gap-10 md:pb-16">
      <section className="overflow-hidden rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="relative aspect-[16/11] sm:aspect-[16/8.8] lg:aspect-[16/6.3]">
          <picture>
            <source media="(min-width: 1024px)" srcSet={heroDesktopImageUrl} />
            <img
              src={heroMobileImageUrl}
              alt={t(dict, "seo.home.heroAlt")}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </picture>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,16,14,0.14)_0%,rgba(18,16,14,0.24)_26%,rgba(18,16,14,0.52)_100%)]" />
          <div className="absolute inset-x-0 top-0 px-4 pb-6 pt-5 sm:hidden">
            <h1 className="font-display text-[1.05rem] font-bold leading-[1.02] tracking-[-0.03em] text-white">
              {t(dict, "home.hero.title")}
            </h1>
          </div>
          <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-14 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
            <div className="max-w-[28rem] space-y-3 sm:max-w-[35rem] sm:space-y-5">
              <div className="space-y-2.5">
                <h1 className="hidden font-display max-w-[13ch] text-[1.05rem] font-bold leading-[1.02] tracking-[-0.03em] text-white sm:block sm:max-w-[13ch] sm:text-[1.45rem] lg:max-w-none lg:whitespace-nowrap lg:text-[2rem]">
                  {t(dict, "home.hero.title")}
                </h1>
                <p className="max-w-[19rem] whitespace-pre-line text-sm leading-6 text-white/84 sm:max-w-[33rem] sm:text-base sm:leading-8">
                  {t(dict, "home.hero.body")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5 sm:hidden">
                {mobileHeroCtas.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition-colors sm:px-5 ${
                      item.primary
                        ? "bg-[#f6efe4] text-[color:var(--text-strong)] hover:bg-[#fbf6ee]"
                        : "border border-white/70 bg-[rgba(255,248,240,0.42)] text-[#fffaf3] shadow-[0_10px_22px_rgba(18,16,14,0.18)] backdrop-blur-[2px] hover:bg-[rgba(255,248,240,0.52)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="hidden flex-wrap gap-3 sm:flex">
                {heroCtas.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition-colors sm:px-5 ${
                      item.primary
                        ? "bg-[#f6efe4] text-[color:var(--text-strong)] hover:bg-[#fbf6ee]"
                        : "border border-white/70 bg-[rgba(255,248,240,0.42)] text-[#fffaf3] shadow-[0_10px_22px_rgba(18,16,14,0.18)] backdrop-blur-[2px] hover:bg-[rgba(255,248,240,0.52)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {mobileSecondaryHeroCta ? (
        <div className="-mt-3 sm:hidden">
          <Link
            href={mobileSecondaryHeroCta.href}
            className="inline-flex min-h-10 items-center text-sm font-medium text-[color:var(--text-strong)] underline decoration-[rgba(47,36,29,0.3)] underline-offset-4 transition-colors hover:text-[color:var(--text-body)]"
          >
            {mobileSecondaryHeroCta.label}
          </Link>
        </div>
      ) : null}

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
            <ArtistLinks
              dict={dict}
              className="border-t border-[var(--border-soft)] pt-4"
              titleClassName="text-[color:var(--text-muted)]"
              linksClassName="gap-x-5 gap-y-2"
              linkClassName="text-[color:var(--text-body)]"
              facebookLabel="facebook.com/LevanMargianiArt"
              instagramLabel="instagram.com/levanmargiani_art"
            />
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
