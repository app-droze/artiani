import type { Metadata } from "next";
import { CheckoutView } from "@/src/components/checkout/CheckoutView";
import { getDictionary } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import { getPublicBaseUrl } from "@/src/lib/env.server";
import { buildSeoPageUrl } from "@/src/lib/seo";

type PageProps = {
  params: Promise<{ lang: Locale }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const title = dict["seo.checkout.title"];
  const description = dict["seo.checkout.description"];
  const url = buildSeoPageUrl(getPublicBaseUrl(), lang, "/checkout");

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
  const dict = await getDictionary(lang);

  return <CheckoutView lang={lang} dict={dict} />;
}
