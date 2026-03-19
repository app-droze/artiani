import type { Metadata } from "next";
import { TrackOrderView } from "@/src/components/track/TrackOrderView";
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
  const title = dict["seo.track.title"];
  const description = dict["seo.track.description"];
  const url = buildSeoPageUrl(getPublicBaseUrl(), lang, "/track");

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

export default async function TrackPage({ params }: PageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return <TrackOrderView lang={lang} dict={dict} />;
}
