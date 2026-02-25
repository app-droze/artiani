import { HomePage } from "@/src/components/HomePage";
import { getDictionary } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type PageProps = {
  params: Promise<{ lang: Locale }>;
};

export default async function Home({ params }: PageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return <HomePage lang={lang} dict={dict} />;
}
