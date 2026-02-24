import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "@/src/components/CartProvider";
import { SiteNav } from "@/src/components/SiteNav";
import { getDictionary } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import { t } from "@/src/i18n/getDictionary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const baseTitle = t(dict, "site.title");

  return {
    title: {
      default: baseTitle,
      template: `%s`,
    },
    description: t(dict, "home.subtitle"),
  };
}

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ lang: Locale }>;
};

export default async function LangLayout({ children, params }: LayoutProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <div className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <CartProvider>
        <SiteNav lang={lang} dict={dict} />
        {children}
      </CartProvider>
    </div>
  );
}
