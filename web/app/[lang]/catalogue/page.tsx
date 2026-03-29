import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogueViewTracker } from "@/src/components/catalogue/CatalogueViewTracker";
import { CatalogueGrid } from "@/src/components/catalogue/CatalogueGrid";
import { getDictionary } from "@/src/i18n/getDictionary";
import { defaultLocale, isLocale, type Locale } from "@/src/i18n/locales";
import { getCatalogueProducts } from "@/src/lib/catalogueQueries";
import {
  getCatalogueCategoryListLabel,
  groupCatalogueProductsByCategory,
} from "@/src/lib/catalogueModels";
import { getPublicBaseUrl } from "@/src/lib/env.server";
import { buildCatalogueSeoTitle, buildSeoPageUrl } from "@/src/lib/seo";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ type?: string }>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const { type } = await searchParams;
  const safeLang: Locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(safeLang);
  const products = await getCatalogueProducts(safeLang);
  const categoryGroups = groupCatalogueProductsByCategory(products, safeLang);
  const selectedGroup = type
    ? categoryGroups.find((group) => group.filterValue === type) ?? null
    : null;
  const selectedLabel = selectedGroup
    ? getCatalogueCategoryListLabel({
        category: selectedGroup.category,
        subtypeCode: selectedGroup.subtypeCode,
        lang: safeLang,
      })
    : null;
  const title = buildCatalogueSeoTitle(dict, selectedLabel);
  const description = dict["seo.catalogue.description"];
  const baseUrl = getPublicBaseUrl();
  const url = selectedGroup
    ? `${buildSeoPageUrl(baseUrl, safeLang, "/catalogue")}?type=${selectedGroup.filterValue}`
    : buildSeoPageUrl(baseUrl, safeLang, "/catalogue");

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
  if (!isLocale(lang)) {
    notFound();
  }

  const { type } = await searchParams;
  const dict = await getDictionary(lang);
  const products = await getCatalogueProducts(lang);
  const activeCategoryFilters = new Set(
    groupCatalogueProductsByCategory(products, lang).map((group) => group.filterValue),
  );
  const selectedFilter = type && activeCategoryFilters.has(type) ? type : undefined;

  return (
    <>
      <CatalogueViewTracker lang={lang} />
      <CatalogueGrid products={products} lang={lang} dict={dict} selectedFilter={selectedFilter} />
    </>
  );
}
