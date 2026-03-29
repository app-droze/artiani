import { notFound } from "next/navigation";
import { CartView } from "@/src/components/cart/CartView";
import { getDictionary } from "@/src/i18n/getDictionary";
import { isLocale } from "@/src/i18n/locales";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export default async function CartPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) {
    notFound();
  }

  const dict = await getDictionary(lang);

  return <CartView lang={lang} dict={dict} />;
}
