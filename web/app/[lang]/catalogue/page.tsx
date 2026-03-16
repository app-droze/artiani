import { CatalogueGrid } from "@/src/components/catalogue/CatalogueGrid";
import { getDictionary } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import { getCatalogueProducts, isCatalogueVisibleFilter } from "@/src/lib/catalogueQueries";

type PageProps = {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ type?: string }>;
};

export default async function CataloguePage({ params, searchParams }: PageProps) {
  const { lang } = await params;
  const { type } = await searchParams;
  const dict = await getDictionary(lang);
  const selectedFilter = isCatalogueVisibleFilter(type) ? type : undefined;
  const products = await getCatalogueProducts(lang);

  return <CatalogueGrid products={products} lang={lang} dict={dict} selectedFilter={selectedFilter} />;
}
