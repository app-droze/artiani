import type { Metadata } from "next";
import { CatalogueGrid } from "@/src/components/catalogue/CatalogueGrid";
import { getDictionary } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
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
  const products = await getCatalogueProducts(lang);
  const selectedCategory = type
    ? products.find((product) => product.category.slug === type)?.category ?? null
    : null;
  const selectedLabel = selectedCategory?.name ?? null;
  const title = buildCatalogueSeoTitle(dict, selectedLabel);
  const description = dict["seo.catalogue.description"];
  const baseUrl = getPublicBaseUrl();
  const url = selectedCategory
    ? `${buildSeoPageUrl(baseUrl, lang, "/catalogue")}?type=${selectedCategory.slug}`
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
  const products = await getCatalogueProducts(lang);
  const activeCategorySlugs = new Set(products.map((product) => product.category.slug));
  const selectedFilter = type && activeCategorySlugs.has(type) ? type : undefined;

  return <CatalogueGrid products={products} lang={lang} dict={dict} selectedFilter={selectedFilter} />;
}
