import Link from "next/link";
import { ProductCard } from "@/src/components/catalogue/ProductCard";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import type {
  CatalogueProduct,
  CatalogueVisibleFilter,
} from "@/src/lib/catalogueModels";
import {
  CATALOGUE_GROUP_ORDER,
  CATALOGUE_TOP_ANCHOR,
  getCatalogueSectionAnchor,
  getCatalogueSectionLabelKey,
  getCatalogueVisibleFilter,
} from "@/src/lib/catalogueModels";

type CatalogueGridProps = {
  products: CatalogueProduct[];
  lang: Locale;
  dict: Dictionary;
  selectedFilter?: CatalogueVisibleFilter;
};

const filterItems: Array<{ key: "all" | CatalogueVisibleFilter; hrefType?: CatalogueVisibleFilter }> = [
  { key: "all" },
  { key: "cloths", hrefType: "cloths" },
  { key: "runners", hrefType: "runners" },
  { key: "pillows", hrefType: "pillows" },
  { key: "scarves", hrefType: "scarves" },
];

export const CatalogueGrid = ({
  products,
  lang,
  dict,
  selectedFilter,
}: CatalogueGridProps) => {
  const filterCounts = CATALOGUE_GROUP_ORDER.reduce<Record<CatalogueVisibleFilter, number>>((counts, key) => {
    counts[key] = products.filter((product) => getCatalogueVisibleFilter(product.productType) === key).length;
    return counts;
  }, {
    cloths: 0,
    runners: 0,
    pillows: 0,
    scarves: 0,
  });
  const filteredProducts = selectedFilter
    ? products.filter((product) => getCatalogueVisibleFilter(product.productType) === selectedFilter)
    : products;
  const groupedProducts = CATALOGUE_GROUP_ORDER
    .map((key) => ({
      key,
      products: filteredProducts.filter(
        (product) => getCatalogueVisibleFilter(product.productType) === key,
      ),
    }))
    .filter((group) => group.products.length > 0);

  return (
  <section
    id={CATALOGUE_TOP_ANCHOR}
    className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 pb-10 pt-4 sm:px-6 sm:pb-14 sm:pt-6 md:gap-8 md:pb-16"
  >
    <div className="rounded-[2rem] bg-white/72 p-2 sm:p-2.5">
      <div className="flex flex-wrap gap-2 rounded-[1.5rem] bg-black/[0.03] p-2">
        {filterItems.map((filter) => {
          const href = filter.hrefType
            ? `/${lang}/catalogue?type=${filter.hrefType}`
            : `/${lang}/catalogue`;
          const isActive =
            filter.key === "all" ? !selectedFilter : selectedFilter === filter.hrefType;
          const count = filter.key === "all" ? products.length : filterCounts[filter.hrefType ?? "cloths"];

          return (
            <Link
              key={filter.key}
              href={href}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm transition-colors ${
                isActive ? "bg-black !text-white" : "bg-white/72 text-black/70 hover:bg-white"
              }`}
            >
              {t(dict, `catalogue.filters.${filter.key}`)}
              <span
                className={`min-w-5 rounded-full px-1.5 py-0.5 text-[11px] leading-none ${
                  isActive ? "bg-white/18 text-white" : "bg-black/[0.055] text-black/62"
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
      <div className="space-y-10">
        {groupedProducts.map((group) => (
          <section
            key={group.key}
            id={getCatalogueSectionAnchor(group.key)}
            className="scroll-mt-6 space-y-4"
          >
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight text-black sm:text-2xl">
                  {t(dict, getCatalogueSectionLabelKey(group.key))}
                </h2>
                <p className="text-sm text-black/56">
                  {group.products.length} {t(dict, "catalogue.sectionCount")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
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
