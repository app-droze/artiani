import Link from "next/link";
import { ProductCard } from "@/src/components/catalogue/ProductCard";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import type {
  CatalogueProduct,
  CatalogueVisibleFilter,
} from "@/src/lib/catalogueQueries";

type CatalogueGridProps = {
  products: CatalogueProduct[];
  lang: Locale;
  dict: Dictionary;
  selectedFilter?: CatalogueVisibleFilter;
};

const filterItems: Array<{ key: "all" | CatalogueVisibleFilter; hrefType?: CatalogueVisibleFilter }> = [
  { key: "all" },
  { key: "cloths", hrefType: "cloths" },
];

export const CatalogueGrid = ({
  products,
  lang,
  dict,
  selectedFilter,
}: CatalogueGridProps) => {
  const groupedProducts = products.length > 0 ? [{ key: "cloths" as const, products }] : [];

  return (
  <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-7 pt-4 sm:px-6 sm:pb-10 sm:pt-5 md:pb-14 md:pt-6">
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filterItems.map((filter) => {
          const href = filter.hrefType
            ? `/${lang}/catalogue?type=${filter.hrefType}`
            : `/${lang}/catalogue`;
          const isActive =
            filter.key === "all" ? !selectedFilter : selectedFilter === filter.hrefType;

          return (
            <Link
              key={filter.key}
              href={href}
              className={`rounded-full px-3 py-1.5 text-sm ${
                isActive ? "bg-black !text-white" : "bg-black/5 text-black/70"
              }`}
            >
              {t(dict, `catalogue.filters.${filter.key}`)}
            </Link>
          );
        })}
      </div>
    </div>

    {products.length > 0 ? (
      <div className="space-y-8">
        {groupedProducts.map((group) => (
          <section key={group.key} className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {t(dict, "catalogue.common.cloths")}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
