import { CartView } from "@/src/components/cart/CartView";
import { getDictionary } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type PageProps = {
  params: Promise<{ lang: Locale }>;
};

export default async function CartPage({ params }: PageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return <CartView lang={lang} dict={dict} />;
}
