import { products } from "@/src/data/products";
import { ShopCatalog } from "@/src/components/ShopCatalog";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type PageProps = {
  params: Promise<{ lang: Locale }>;
};

export default async function ShopPage({ params }: PageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <main className="min-h-screen bg-[#f8f6f2] px-5 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="space-y-4">
          <h1 className="text-xl font-semibold tracking-[0.15em] text-black/60 uppercase sm:text-2xl">
            {t(dict, "shop.title")}
          </h1>
        </div>
        <ShopCatalog products={products} lang={lang} dict={dict} />
      </div>
    </main>
  );
}
