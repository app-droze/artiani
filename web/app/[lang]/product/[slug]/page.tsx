import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { products } from "@/src/data/products";
import { pick } from "@/src/data/products";
import { ProductDetails } from "@/src/components/ProductDetails";
import { getDictionary } from "@/src/i18n/getDictionary";
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
  if (!product) {
    return { title: "Artiani" };
  }
  const name = pick(product.name, lang);
  return { title: `${name} · Artiani` };
}

export default async function ProductPage({ params }: PageProps) {
  const { lang, slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) {
    notFound();
  }
  const dict = await getDictionary(lang);

  return (
    <main className="min-h-screen bg-[#f8f6f2] px-5 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <ProductDetails product={product} lang={lang} dict={dict} />
      </div>
    </main>
  );
}
