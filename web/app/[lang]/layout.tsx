import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CartProvider } from "@/src/components/CartProvider";
import { HtmlLangSync } from "@/src/components/HtmlLangSync";
import { SiteFooter } from "@/src/components/SiteFooter";
import { SiteNav } from "@/src/components/SiteNav";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import { defaultLocale, isLocale, locales, type Locale } from "@/src/i18n/locales";

export const generateStaticParams = () => locales.map((lang) => ({ lang }));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const safeLang: Locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(safeLang);

  return {
    title: t(dict, "site.title"),
    description: t(dict, "site.description"),
  };
}

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

export default async function LangLayout({ children, params }: LayoutProps) {
  const { lang } = await params;

  if (!isLocale(lang)) {
    notFound();
  }

  const dict = await getDictionary(lang);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <HtmlLangSync lang={lang} />
      <CartProvider>
        <SiteNav lang={lang} dict={dict} />
        <div className="flex min-h-[calc(100vh-1px)] flex-col">
          <main className="flex-1">{children}</main>
          <SiteFooter lang={lang} dict={dict} />
        </div>
      </CartProvider>
    </div>
  );
}
