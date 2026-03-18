import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailView } from "@/src/components/product/ProductDetailView";
import { getDictionary } from "@/src/i18n/getDictionary";
import { type Locale, isLocale, defaultLocale } from "@/src/i18n/locales";
import { getCatalogueProducts, getProductBySlug } from "@/src/lib/catalogueQueries";

type PageProps = {
  params: Promise<{ lang: Locale; slug: string }>;
};

const shuffleProducts = <T,>(items: T[]) => {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
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
  const relatedProducts = shuffleProducts(products.filter((item) => item.slug !== product.slug))
    .slice(0, 4)
    .map((item) => ({
      slug: item.slug,
      title: item.title,
      productType: item.productType,
      cardImage: item.cardImage,
      mainImage: item.mainImage,
      defaultPrice: item.defaultPrice,
    }));

  return (
    <ProductDetailView
      product={product}
      lang={safeLang}
      dict={dict}
      relatedProducts={relatedProducts}
    />
  );
}
