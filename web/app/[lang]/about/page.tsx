import { getDictionary, t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type PageProps = {
  params: Promise<{ lang: Locale }>;
};

export default async function AboutPage({ params }: PageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <main className="min-h-screen px-5 pb-24 pt-16">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <header className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-black sm:text-4xl">
            {t(dict, "about.title")}
          </h1>
        </header>

        <section className="space-y-4 text-base text-black/60">
          <p>{t(dict, "about.p1")}</p>
          <p>{t(dict, "about.p2")}</p>
          <p>{t(dict, "about.p3")}</p>
        </section>

        <section className="space-y-3 rounded-2xl border border-black/10 bg-white/60 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-black/60">
            {t(dict, "about.selectedTitle")}
          </h2>
          <ul className="list-disc pl-5 text-sm text-black/60">
            <li>{t(dict, "about.selected.bonhams2023")}</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
