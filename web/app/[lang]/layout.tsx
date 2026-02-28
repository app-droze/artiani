import type { Metadata } from "next";
import { CartProvider } from "@/src/components/CartProvider";
import { SiteNav } from "@/src/components/SiteNav";
import { getDictionary } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import { defaultLocale, isLocale } from "@/src/i18n/locales";
import { t } from "@/src/i18n/getDictionary";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const safeLang: Locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(safeLang);
  const baseTitle = t(dict, "site.title");

  return {
    title: {
      default: baseTitle,
      template: `%s`,
    },
    description: t(dict, "home.hero.subtitle"),
  };
}

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

export default async function LangLayout({ children, params }: LayoutProps) {
  const { lang } = await params;
  const safeLang: Locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(safeLang);

  return (
    <div className="antialiased">
      <CartProvider>
        <SiteNav lang={safeLang} dict={dict} />
        <main>{children}</main>
      </CartProvider>
    </div>
  );
}
