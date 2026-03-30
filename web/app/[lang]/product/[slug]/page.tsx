import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StructuredDataScript } from "@/src/components/StructuredDataScript";
import { ProductDetailView } from "@/src/components/product/ProductDetailView";
import { getDictionary } from "@/src/i18n/getDictionary";
import { type Locale, isLocale, defaultLocale } from "@/src/i18n/locales";
import { getPhoneCaseModels } from "@/src/lib/phoneCaseModels";
import { getProductBySlug, getRelatedProducts } from "@/src/lib/catalogueQueries";
import { getPublicBaseUrl } from "@/src/lib/env.server";
import {
  buildProductBreadcrumbStructuredData,
  buildProductSeoDescription,
  buildProductSeoTitle,
  buildProductStructuredData,
  buildSeoPageUrl,
} from "@/src/lib/seo";

type PageProps = {
  params: Promise<{ lang: string; slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  const safeLang: Locale = isLocale(lang) ? lang : defaultLocale;
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
  if (!isLocale(lang)) {
    notFound();
  }

  const safeLang: Locale = lang;
  const product = await getProductBySlug(slug, safeLang);

  if (!product) {
    notFound();
  }

  const [dict, relatedProducts, phoneCaseModels] = await Promise.all([
    getDictionary(safeLang),
    getRelatedProducts({
      currentProduct: product,
      lang: safeLang,
      limit: 4,
    }),
    product.productType === "phone_case" ? getPhoneCaseModels() : Promise.resolve([]),
  ]);
  const baseUrl = getPublicBaseUrl();
  const productStructuredData = buildProductStructuredData({
    baseUrl,
    dict,
    lang: safeLang,
    product,
  });
  const breadcrumbStructuredData = buildProductBreadcrumbStructuredData({
    baseUrl,
    dict,
    lang: safeLang,
    product,
  });

  return (
    <>
      <StructuredDataScript data={productStructuredData} />
      <StructuredDataScript data={breadcrumbStructuredData} />
      <ProductDetailView
        product={product}
        lang={safeLang}
        dict={dict}
        relatedProducts={relatedProducts}
        phoneCaseModels={phoneCaseModels}
      />
    </>
  );
}
