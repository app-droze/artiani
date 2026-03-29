import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StructuredDataScript } from "@/src/components/StructuredDataScript";
import { HomePageView } from "@/src/components/home/HomePageView";
import { getDictionary } from "@/src/i18n/getDictionary";
import { defaultLocale, isLocale, type Locale } from "@/src/i18n/locales";
import { getCatalogueProducts } from "@/src/lib/catalogueQueries";
import { getPublicBaseUrl } from "@/src/lib/env.server";
import { getArtistMediaCards } from "@/src/lib/mediaCards";
import { buildHomeOrganizationStructuredData, buildHomeSeoTitle, buildSeoPageUrl } from "@/src/lib/seo";

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const safeLang: Locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(safeLang);
  const baseUrl = getPublicBaseUrl();
  const title = buildHomeSeoTitle(dict);
  const description = dict["seo.home.description"];
  const url = buildSeoPageUrl(baseUrl, safeLang);

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

export default async function HomePage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) {
    notFound();
  }

  const dict = await getDictionary(lang);
  const products = await getCatalogueProducts(lang);
  const mediaCards = await getArtistMediaCards();
  const organizationStructuredData = buildHomeOrganizationStructuredData({
    baseUrl: getPublicBaseUrl(),
    dict,
    lang,
  });

  return (
    <>
      <StructuredDataScript data={organizationStructuredData} />
      <HomePageView
        lang={lang}
        dict={dict}
        products={products}
        mediaCards={mediaCards}
      />
    </>
  );
}
