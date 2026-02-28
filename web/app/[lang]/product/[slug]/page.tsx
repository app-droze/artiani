import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { products } from "@/src/data/products";
import { pick } from "@/src/data/products";
import { ProductDetails } from "@/src/components/ProductDetails";
import { RelatedProducts } from "@/src/components/product/RelatedProducts";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type PageProps = {
  params: Promise<{ lang: Locale; slug: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const product = products.find((item) => item.slug === slug);
  const dict = await getDictionary(lang as Locale);
  if (!product) {
    return { title: t(dict, "site.title") };
  }
  const name = pick(product.name, lang);
  return { title: `${name} · ${t(dict, "site.title")}` };
}

export default async function ProductPage({ params }: PageProps) {
  const { lang, slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) {
    notFound();
  }
  const dict = await getDictionary(lang);
  const sameKind = products.filter((item) => item.kind === product.kind);
  const kindIndex = sameKind.findIndex((item) => item.slug === product.slug);
  const prevKind = kindIndex > 0 ? sameKind[kindIndex - 1] : null;
  const nextKind = kindIndex >= 0 && kindIndex < sameKind.length - 1 ? sameKind[kindIndex + 1] : null;

  const allIndex = products.findIndex((item) => item.slug === product.slug);
  const prevAll = allIndex > 0 ? products[allIndex - 1] : null;
  const nextAll = allIndex >= 0 && allIndex < products.length - 1 ? products[allIndex + 1] : null;

  const prev = prevKind ?? prevAll;
  const next = nextKind ?? nextAll;

  return (
    <main className="min-h-screen bg-[#f8f6f2] px-5 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <ProductDetails
          product={product}
          lang={lang}
          dict={dict}
          prevProduct={prev}
          nextProduct={next}
        />
        <RelatedProducts current={product} lang={lang} dict={dict} />
      </div>
    </main>
  );
}
