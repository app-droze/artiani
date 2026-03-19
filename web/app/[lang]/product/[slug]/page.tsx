import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StructuredDataScript } from "@/src/components/StructuredDataScript";
import { ProductDetailView } from "@/src/components/product/ProductDetailView";
import { getDictionary } from "@/src/i18n/getDictionary";
import { type Locale, isLocale, defaultLocale } from "@/src/i18n/locales";
import { getCatalogueProducts, getProductBySlug } from "@/src/lib/catalogueQueries";
import { getPublicBaseUrl } from "@/src/lib/env.server";
import {
  buildProductSeoDescription,
  buildProductSeoTitle,
  buildProductStructuredData,
  buildSeoPageUrl,
} from "@/src/lib/seo";

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
  const dict = await getDictionary(safeLang);
  const product = await getProductBySlug(slug, safeLang);
  const baseUrl = getPublicBaseUrl();

  return {
    title: product ? buildProductSeoTitle(product, dict) : "Artiani",
    description: product ? buildProductSeoDescription(product, dict) : dict["site.description"],
    alternates: {
      canonical: product ? buildSeoPageUrl(baseUrl, safeLang, `/product/${product.slug}`) : buildSeoPageUrl(baseUrl, safeLang),
    },
    openGraph: product
      ? {
          title: buildProductSeoTitle(product, dict),
          description: buildProductSeoDescription(product, dict),
          url: buildSeoPageUrl(baseUrl, safeLang, `/product/${product.slug}`),
          type: "website",
          images: product.mainImage ? [{ url: product.mainImage, alt: product.title }] : undefined,
        }
      : undefined,
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
  const productStructuredData = buildProductStructuredData({
    baseUrl: getPublicBaseUrl(),
    dict,
    lang: safeLang,
    product,
  });
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
    <>
      <StructuredDataScript data={productStructuredData} />
      <ProductDetailView
        product={product}
        lang={safeLang}
        dict={dict}
        relatedProducts={relatedProducts}
      />
    </>
  );
}
