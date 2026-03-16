import { PagePlaceholder } from "@/src/components/PagePlaceholder";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type PageProps = {
  params: Promise<{ lang: Locale }>;
};

export default async function BiographyPage({ params }: PageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <PagePlaceholder
      title={t(dict, "page.biography.title")}
      body={t(dict, "page.biography.body")}
    />
  );
}
