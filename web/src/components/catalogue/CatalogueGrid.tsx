import Link from "next/link";
import { ProductCard } from "@/src/components/catalogue/ProductCard";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import { CATALOGUE_TOP_ANCHOR, groupCatalogueProductsByCategory, type CatalogueProduct } from "@/src/lib/catalogueModels";

type CatalogueGridProps = {
  products: CatalogueProduct[];
  lang: Locale;
  dict: Dictionary;
  selectedFilter?: string;
};

export const CatalogueGrid = ({
  products,
  lang,
  dict,
  selectedFilter,
}: CatalogueGridProps) => {
  const activeCategoryGroups = groupCatalogueProductsByCategory(products);
  const filteredProducts = selectedFilter
    ? products.filter((product) => product.category.slug === selectedFilter)
    : products;
  const groupedProducts = groupCatalogueProductsByCategory(filteredProducts)
    .filter((group) => group.products.length > 0);

  return (
  <section
    id={CATALOGUE_TOP_ANCHOR}
    className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-10 pt-4 sm:px-6 sm:pb-14 sm:pt-6 md:gap-7 md:pb-16"
  >
    <div className="overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-full gap-2">
        <Link
          href={`/${lang}/catalogue`}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors ${
            !selectedFilter
              ? "border-black bg-black !text-white"
              : "border-black/10 bg-white/84 text-black/72 hover:bg-white"
          }`}
        >
          {t(dict, "catalogue.filters.all")}
          <span
            className={`min-w-5 rounded-full px-1.5 py-0.5 text-[11px] leading-none ${
              !selectedFilter ? "bg-white/18 text-white" : "bg-black/[0.055] text-black/62"
            }`}
          >
            {products.length}
          </span>
        </Link>

        {activeCategoryGroups.map((group) => {
          const { category, count } = group;
          return (
            <Link
              key={category.slug}
              href={`/${lang}/catalogue?type=${category.slug}`}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors ${
                selectedFilter === category.slug
                  ? "border-black bg-black !text-white"
                  : "border-black/10 bg-white/84 text-black/72 hover:bg-white"
              }`}
            >
              {category.name}
              <span
                className={`min-w-5 rounded-full px-1.5 py-0.5 text-[11px] leading-none ${
                  selectedFilter === category.slug
                    ? "bg-white/18 text-white"
                    : "bg-black/[0.055] text-black/62"
                }`}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>
    </div>

    {groupedProducts.length > 0 ? (
      <div className="space-y-7 md:space-y-8">
        {groupedProducts.map((group) => (
          <section
            key={group.key}
            id={group.key}
            className="scroll-mt-6 space-y-3.5"
          >
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-black sm:text-[1.55rem]">
                {group.category.name}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-3 xl:grid-cols-4">
              {group.products.map((product) => (
                <ProductCard key={product.id} product={product} lang={lang} dict={dict} />
              ))}
            </div>
          </section>
        ))}
      </div>
    ) : (
      <div className="rounded-[1.5rem] bg-black/[0.04] px-5 py-8 text-sm text-black/60">
        {t(dict, "catalogue.empty")}
      </div>
    )}
  </section>
  );
};
