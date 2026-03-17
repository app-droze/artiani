import { HomePageView } from "@/src/components/home/HomePageView";
import { getDictionary } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import { getCatalogueProducts } from "@/src/lib/catalogueQueries";

type PageProps = {
  params: Promise<{ lang: Locale }>;
};

export default async function HomePage({ params }: PageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const products = await getCatalogueProducts(lang);

  return <HomePageView lang={lang} dict={dict} products={products} />;
}
