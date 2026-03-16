import { PagePlaceholder } from "@/src/components/PagePlaceholder";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type PageProps = {
  params: Promise<{ lang: Locale }>;
};

export default async function TrackPage({ params }: PageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <PagePlaceholder
      title={t(dict, "page.track.title")}
      body={t(dict, "page.track.body")}
    />
  );
}
