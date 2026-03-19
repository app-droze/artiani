import type { Metadata } from "next";
import { CatalogueGrid } from "@/src/components/catalogue/CatalogueGrid";
import { getDictionary } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import { type CatalogueVisibleFilter, isCatalogueVisibleFilter } from "@/src/lib/catalogueModels";
import { getCatalogueProducts } from "@/src/lib/catalogueQueries";
import { getPublicBaseUrl } from "@/src/lib/env.server";
import { buildCatalogueSeoTitle, buildSeoPageUrl } from "@/src/lib/seo";

type PageProps = {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ type?: string }>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const { type } = await searchParams;
  const dict = await getDictionary(lang);
  const selectedFilter: CatalogueVisibleFilter | undefined = isCatalogueVisibleFilter(type)
    ? type
    : undefined;
  const selectedLabel = selectedFilter ? dict[`catalogue.common.${selectedFilter}`] : null;
  const title = buildCatalogueSeoTitle(dict, selectedLabel);
  const description = dict["seo.catalogue.description"];
  const baseUrl = getPublicBaseUrl();
  const url = selectedFilter
    ? `${buildSeoPageUrl(baseUrl, lang, "/catalogue")}?type=${selectedFilter}`
    : buildSeoPageUrl(baseUrl, lang, "/catalogue");

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
    },
  };
}

export default async function CataloguePage({ params, searchParams }: PageProps) {
  const { lang } = await params;
  const { type } = await searchParams;
  const dict = await getDictionary(lang);
  const selectedFilter: CatalogueVisibleFilter | undefined = isCatalogueVisibleFilter(type)
    ? type
    : undefined;
  const products = await getCatalogueProducts(lang);

  return <CatalogueGrid products={products} lang={lang} dict={dict} selectedFilter={selectedFilter} />;
}
