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

const HOME_CATEGORY_CARD_ORDER = ["works", "tablecloth", "phone_case", "pillow", "headscarf"] as const;

const getHomeCategoryOrder = (categorySlug: string) => {
  const preferredIndex = HOME_CATEGORY_CARD_ORDER.indexOf(
    categorySlug as (typeof HOME_CATEGORY_CARD_ORDER)[number],
  );

  return preferredIndex === -1 ? HOME_CATEGORY_CARD_ORDER.length : preferredIndex;
};

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
    return (
      getHomeCategoryOrder(left.category.slug) - getHomeCategoryOrder(right.category.slug) ||
      left.sortOrder - right.sortOrder ||
      left.label.localeCompare(right.label)
    );
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
  const heroCta = {
    href: buildCatalogueCategorySectionHref(lang, "works"),
    label: t(dict, "home.hero.ctaOriginals"),
  };
  const heroBody = t(dict, "home.hero.body");
  const heroBodyLines = heroBody
    .split("\n")
    .filter((line) => line.trim().length > 0);
  const desktopHeroBody =
    lang === "ka"
      ? "ლევან მარგიანის ორიგინალი ნამუშევრები\nდა საკოლექციო ტექსტილი"
      : heroBodyLines.join(" ");

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 pb-10 pt-4 sm:px-6 sm:gap-8 sm:pb-14 sm:pt-6 md:gap-10 md:pb-16">
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
          <div className="absolute inset-x-0 top-0 px-4 pb-6 pt-5 sm:hidden">
            <h1 className="font-display text-[1.05rem] font-bold leading-[1.02] tracking-[-0.03em] text-white">
              {t(dict, "home.hero.title")}
            </h1>
          </div>
          <div className="absolute inset-x-0 bottom-0 px-4 pb-2.5 pt-14 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
            <div className="max-w-[28rem] sm:max-w-[35rem]">
              <div className="space-y-2.5">
                <h1 className="hidden font-display max-w-[13ch] text-[1.05rem] font-bold leading-[1.02] tracking-[-0.03em] text-white sm:block sm:max-w-[13ch] sm:text-[1.45rem] lg:max-w-none lg:whitespace-nowrap lg:text-[2rem]">
                  {t(dict, "home.hero.title")}
                </h1>
                <div className="text-white/84 sm:max-w-[33rem]">
                  <div className="space-y-0.5 text-[12px] leading-5 sm:hidden">
                    {heroBodyLines.map((line) => (
                      <span key={line} className="block whitespace-nowrap">
                        {line}
                      </span>
                    ))}
                  </div>
                  <p className="hidden whitespace-pre-line text-base leading-8 sm:block">
                    {desktopHeroBody}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 px-4 pb-2.5 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
            <Link
              href={heroCta.href}
              className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-full bg-[#f6efe4] px-4 py-2 text-[11px] font-medium text-[color:var(--text-strong)] transition-colors hover:bg-[#fbf6ee] sm:min-h-11 sm:px-5 sm:py-2.5 sm:text-sm"
            >
              {heroCta.label}
            </Link>
          </div>
        </div>
      </section>

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
            <Link href={`/${lang}/biography`} className="ui-button-secondary w-fit">
              {t(dict, "nav.aboutArtiani")}
            </Link>
            <ArtistLinks
              dict={dict}
              className="border-t border-[var(--border-soft)] pt-4"
              titleClassName="text-[color:var(--text-muted)]"
              linksClassName="gap-x-5 gap-y-2"
              linkClassName="text-[color:var(--text-body)]"
              facebookLabel="facebook.com/LevanMargianiArt"
              instagramLabel="instagram.com/levanmargiani_art"
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
