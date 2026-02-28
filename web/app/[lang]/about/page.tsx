import { getDictionary, t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type PageProps = {
  params: Promise<{ lang: Locale }>;
};

export default async function AboutPage({ params }: PageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const milestones = [
    "about.milestone1",
    "about.milestone2",
    "about.milestone3",
    "about.milestone4",
    "about.milestone5",
    "about.milestone6",
  ];

  return (
    <main className="min-h-screen px-5 pb-24 pt-16">
      <div className="mx-auto w-full max-w-3xl space-y-10">
        <header className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-black sm:text-4xl">
            {t(dict, "about.title")}
          </h1>
          <p className="text-sm text-black/60">{t(dict, "about.subtitle")}</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-black/60">
            {t(dict, "about.sectionOverview")}
          </h2>
          <p className="text-base leading-relaxed text-black/70">{t(dict, "about.overview")}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-black/60">
            {t(dict, "about.sectionPractice")}
          </h2>
          <p className="text-base leading-relaxed text-black/70">{t(dict, "about.practice")}</p>
        </section>

        <section className="space-y-3 rounded-2xl border border-black/10 bg-white/60 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-black/60">
            {t(dict, "about.sectionMilestones")}
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-black/70">
            {milestones.map((itemKey) => (
              <li key={itemKey}>{t(dict, itemKey)}</li>
            ))}
          </ul>
        </section>

        <p className="text-sm text-black/60">{t(dict, "about.footerLink")}</p>
      </div>
    </main>
  );
}
