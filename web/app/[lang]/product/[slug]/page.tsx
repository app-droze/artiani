import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { products } from "@/src/data/products";
import { pick } from "@/src/data/products";
import { ProductDetails } from "@/src/components/ProductDetails";
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
  const list = products.filter((item) => item.kind === product.kind);
  const index = list.findIndex((item) => item.slug === product.slug);
  const prev = index > 0 ? list[index - 1] : null;
  const next = index >= 0 && index < list.length - 1 ? list[index + 1] : null;

  return (
    <main className="min-h-screen bg-[#f8f6f2] px-5 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <ProductDetails
          product={product}
          lang={lang}
          dict={dict}
          prevProduct={prev}
          nextProduct={next}
        />
      </div>
    </main>
  );
}
