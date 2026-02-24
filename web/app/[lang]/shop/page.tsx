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
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50">
            {t(dict, "shop.kicker")}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-black sm:text-4xl">
            {t(dict, "shop.title")}
          </h1>
          <p className="max-w-2xl text-sm text-black/60">
            {t(dict, "shop.subtitle")}
          </p>
        </div>
        <ShopCatalog products={products} lang={lang} dict={dict} />
      </div>
    </main>
  );
}
