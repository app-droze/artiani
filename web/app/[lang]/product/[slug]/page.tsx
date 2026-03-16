import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailView } from "@/src/components/product/ProductDetailView";
import { getDictionary } from "@/src/i18n/getDictionary";
import { type Locale, isLocale, defaultLocale } from "@/src/i18n/locales";
import { getCatalogueProducts, getProductBySlug } from "@/src/lib/catalogueQueries";

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
  const safeLang = isLocale(lang) ? lang : defaultLocale;
  const products = await getCatalogueProducts(safeLang);
  const currentIndex = products.findIndex((item) => item.slug === slug);
  const product = currentIndex >= 0 ? products[currentIndex] : await getProductBySlug(slug, safeLang);

  if (!product) {
    notFound();
  }

  const dict = await getDictionary(safeLang);
  const previousProduct =
    currentIndex > 0
      ? {
          slug: products[currentIndex - 1].slug,
          title: products[currentIndex - 1].title,
          productType: products[currentIndex - 1].productType,
          cardImage: products[currentIndex - 1].cardImage,
          mainImage: products[currentIndex - 1].mainImage,
        }
      : null;
  const nextProduct =
    currentIndex >= 0 && currentIndex < products.length - 1
      ? {
          slug: products[currentIndex + 1].slug,
          title: products[currentIndex + 1].title,
          productType: products[currentIndex + 1].productType,
          cardImage: products[currentIndex + 1].cardImage,
          mainImage: products[currentIndex + 1].mainImage,
        }
      : null;

  return (
    <ProductDetailView
      product={product}
      lang={safeLang}
      dict={dict}
      previousProduct={previousProduct}
      nextProduct={nextProduct}
    />
  );
}
