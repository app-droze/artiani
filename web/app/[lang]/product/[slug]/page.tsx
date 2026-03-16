import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailView } from "@/src/components/product/ProductDetailView";
import { getDictionary } from "@/src/i18n/getDictionary";
import { type Locale, isLocale, defaultLocale } from "@/src/i18n/locales";
import { getProductBySlug } from "@/src/lib/catalogueQueries";

type PageProps = {
  params: Promise<{ lang: Locale; slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  const safeLang = isLocale(lang) ? lang : defaultLocale;
  const product = await getProductBySlug(slug, safeLang);

  return {
    title: product ? `${product.title} | Artiani` : "Artiani",
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { lang, slug } = await params;
  const product = await getProductBySlug(slug, lang);

  if (!product) {
    notFound();
  }

  const dict = await getDictionary(lang);
  return <ProductDetailView product={product} dict={dict} />;
}
