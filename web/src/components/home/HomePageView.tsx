import { ArtistLinks } from "@/src/components/ArtistLinks";
import Image from "next/image";
import Link from "next/link";
import { HomeCategoryCarousel } from "@/src/components/home/HomeCategoryCarousel";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
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
};

const HERO_BANNER_URL =
  "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/pillows.png";

export const HomePageView = ({ lang, dict, products }: HomePageViewProps) => {
  const groupedProducts = groupCatalogueProductsByCategory(products, lang);
  const bannerCategoryLabel = groupedProducts[0]
    ? getCatalogueCategoryListLabel({
        category: groupedProducts[0].category,
        subtypeCode: groupedProducts[0].subtypeCode,
        lang,
      })
    : null;
  const categoryItems = groupedProducts.slice(1).map((group) => {
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
        className="group relative block overflow-hidden rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface)]"
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
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(18,16,14,0.40)] via-[rgba(18,16,14,0.12)] to-[rgba(18,16,14,0)] to-[45%]" />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-12 sm:px-6 sm:pb-6">
            <div className="space-y-2">
              <p className="ui-overline text-white/78">
                {t(dict, "home.banner.eyebrow")}
              </p>
              {bannerCategoryLabel ? (
                <h1 className="font-display max-w-[7ch] text-[34px] font-bold leading-[1.04] tracking-[-0.025em] text-white sm:max-w-[8ch] sm:text-[48px] sm:leading-[1.02]">
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

      </div>

    </section>
  );
};
