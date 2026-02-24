import Link from "next/link";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type PageProps = {
  params: Promise<{ lang: Locale }>;
};

export default async function Home({ params }: PageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff4e6,_#ffffff_55%)] px-5 py-16">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-start gap-8">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-black/50">
          {t(dict, "home.kicker")}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl">
          {t(dict, "home.title")}
        </h1>
        <p className="max-w-xl text-base text-black/60">
          {t(dict, "home.subtitle")}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/${lang}/shop`}
            className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
          >
            {t(dict, "home.cta_shop")}
          </Link>
          <Link
            href={`/${lang}/cart`}
            className="rounded-full border border-black px-6 py-3 text-sm font-semibold text-black"
          >
            {t(dict, "home.cta_cart")}
          </Link>
        </div>
      </div>
    </main>
  );
}
