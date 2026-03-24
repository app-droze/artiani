import Link from "next/link";
import { ProductCard } from "@/src/components/catalogue/ProductCard";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import {
  CATALOGUE_TOP_ANCHOR,
  getCatalogueCategoryListLabel,
  matchesCatalogueCategoryListFilter,
  groupCatalogueProductsByCategory,
  type CatalogueProduct,
} from "@/src/lib/catalogueModels";

type CatalogueGridProps = {
  products: CatalogueProduct[];
  lang: Locale;
  dict: Dictionary;
  selectedFilter?: string;
};

const isRoundTablecloth = (product: CatalogueProduct) =>
  product.category.slug === "tablecloth" &&
  (product.subtypeCode === "round" || product.productType === "tablecloth_round");

const prioritizeRoundTablecloths = (products: CatalogueProduct[]) => {
  const roundTablecloths: CatalogueProduct[] = [];
  const otherProducts: CatalogueProduct[] = [];

  for (const product of products) {
    if (isRoundTablecloth(product)) {
      roundTablecloths.push(product);
      continue;
    }

    otherProducts.push(product);
  }

  return [...roundTablecloths, ...otherProducts];
};

export const CatalogueGrid = ({
  products,
  lang,
  dict,
  selectedFilter,
}: CatalogueGridProps) => {
  const activeCategoryGroups = groupCatalogueProductsByCategory(products, lang);
  const filteredProducts = selectedFilter
    ? products.filter((product) => matchesCatalogueCategoryListFilter(product, selectedFilter))
    : products;
  const groupedProducts = groupCatalogueProductsByCategory(filteredProducts, lang)
    .filter((group) => group.products.length > 0)
    .map((group) => ({
      ...group,
      products: prioritizeRoundTablecloths(group.products),
    }));

  return (
    <section
      id={CATALOGUE_TOP_ANCHOR}
      className="mx-auto flex w-full max-w-[90rem] flex-col gap-4 px-4 pb-10 pt-3 sm:px-6 sm:pb-12 sm:pt-5 lg:gap-5 lg:px-8 xl:pb-14"
    >
      <div className="overflow-x-auto pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-full gap-2.5 lg:gap-3">
          <Link
            href={`/${lang}/catalogue`}
            data-active={!selectedFilter}
            className="ui-pill shrink-0"
          >
            {t(dict, "catalogue.filters.all")}
            <span className="ui-pill-count">{products.length}</span>
          </Link>

          {activeCategoryGroups.map((group) => {
            const { count, filterValue, label } = group;
            return (
              <Link
                key={group.key}
                href={`/${lang}/catalogue?type=${filterValue}`}
                data-active={selectedFilter === filterValue}
                className="ui-pill shrink-0"
              >
                {label}
                <span className="ui-pill-count">{count}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {groupedProducts.length > 0 ? (
        <div className="space-y-9 lg:space-y-14">
          {groupedProducts.map((group) => (
            <section
              key={group.key}
              id={group.key}
              className="scroll-mt-6 space-y-3.5 sm:space-y-[0.875rem] lg:space-y-[1.375rem]"
            >
              <div>
                <h2 className="font-display text-[1.875rem] font-bold leading-[1.01] tracking-[-0.02em] text-[color:var(--text-strong)] sm:text-[2.25rem] lg:text-[2.75rem]">
                  {getCatalogueCategoryListLabel({
                    category: group.category,
                    subtypeCode: group.subtypeCode,
                    lang,
                  })}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
                {group.products.map((product) => (
                  <ProductCard key={product.id} product={product} lang={lang} dict={dict} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="ui-card-md px-5 py-8 text-sm text-[color:var(--text-muted)]">
          {t(dict, "catalogue.empty")}
        </div>
      )}
    </section>
  );
};
