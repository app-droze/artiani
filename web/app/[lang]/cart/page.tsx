import { CartView } from "@/src/components/CartView";
import { getDictionary } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type PageProps = {
  params: Promise<{ lang: Locale }>;
};

export default async function CartPage({ params }: PageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <main className="min-h-screen bg-[#f8f6f2] px-5 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <CartView lang={lang} dict={dict} />
      </div>
    </main>
  );
}
