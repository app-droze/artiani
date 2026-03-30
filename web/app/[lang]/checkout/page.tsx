import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getDictionary } from "@/src/i18n/getDictionary";
import { defaultLocale, isLocale, type Locale } from "@/src/i18n/locales";
import { getPublicBaseUrl } from "@/src/lib/env.server";
import { buildSeoPageUrl } from "@/src/lib/seo";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const safeLang: Locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(safeLang);
  const title = dict["seo.checkout.title"];
  const description = dict["seo.checkout.description"];
  const url = buildSeoPageUrl(getPublicBaseUrl(), safeLang, "/checkout");

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

export default async function CheckoutPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) {
    notFound();
  }
  redirect(`/${lang}/cart`);
}
