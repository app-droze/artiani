import { CheckoutView } from "@/src/components/checkout/CheckoutView";
import { getDictionary } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type PageProps = {
  params: Promise<{ lang: Locale }>;
};

export default async function CheckoutPage({ params }: PageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return <CheckoutView lang={lang} dict={dict} />;
}
