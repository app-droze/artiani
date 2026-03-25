import type { Metadata } from "next";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import { getPublicBaseUrl } from "@/src/lib/env.server";
import { buildSeoPageUrl } from "@/src/lib/seo";

type PageProps = {
  params: Promise<{ lang: Locale }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const title = dict["seo.delivery.title"];
  const description = dict["seo.delivery.description"];
  const url = buildSeoPageUrl(getPublicBaseUrl(), lang, "/delivery");

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
    },
  };
}

export default async function DeliveryPage({ params }: PageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const sections = [
    {
      title: t(dict, "page.delivery.section.transfer.title"),
      body: t(dict, "page.delivery.section.transfer.body"),
    },
    {
      title: t(dict, "page.delivery.section.delivery.title"),
      body: t(dict, "page.delivery.section.delivery.body"),
    },
    {
      title: t(dict, "page.delivery.section.paintings.title"),
      body: t(dict, "page.delivery.section.paintings.body"),
    },
    {
      title: t(dict, "page.delivery.section.tracking.title"),
      body: t(dict, "page.delivery.section.tracking.body"),
    },
  ];

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-7 sm:px-6 sm:py-10 md:gap-10 md:py-14">
      <div className="max-w-4xl space-y-5">
        <p className="ui-overline">
          {t(dict, "page.delivery.eyebrow")}
        </p>
        <h1 className="font-display text-[2.15rem] font-bold leading-[1.03] tracking-[-0.025em] text-[color:var(--text-strong)] sm:text-[2.85rem]">
          {t(dict, "page.delivery.title")}
        </h1>
        <div className="space-y-4 text-base leading-[1.8] text-[color:var(--text-body)] sm:text-lg">
          {t(dict, "page.delivery.body")
            .split("\n\n")
            .filter(Boolean)
            .map((paragraph) => (
              <p key={paragraph}>
                {paragraph}
              </p>
            ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        {sections.map((section) => (
          <article
            key={section.title}
            className="ui-card-md border border-[var(--border-soft)] bg-white/88 px-5 py-5 sm:px-6 sm:py-6"
          >
            <div className="space-y-2.5">
              <h2 className="text-[1.05rem] font-semibold text-[color:var(--text-strong)] sm:text-[1.12rem]">
                {section.title}
              </h2>
              <div className="space-y-3 text-sm leading-7 text-[color:var(--text-body)] sm:text-[0.98rem]">
                {section.body
                  .split("\n\n")
                  .filter(Boolean)
                  .map((paragraph) => (
                    <p key={paragraph}>
                      {paragraph}
                    </p>
                  ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
