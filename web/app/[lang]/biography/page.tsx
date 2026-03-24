import { getDictionary, t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";
import { getArtistMediaCards } from "@/src/lib/mediaCards";
import { HomeMediaRail } from "@/src/components/home/HomeMediaRail";

type PageProps = {
  params: Promise<{ lang: Locale }>;
};

export default async function BiographyPage({ params }: PageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const mediaCards = await getArtistMediaCards();
  const paragraphs = t(dict, "page.biography.body")
    .split("\n\n")
    .filter(Boolean);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-7 sm:px-6 sm:py-10 md:gap-10 md:py-14">
      <div className="max-w-4xl space-y-5">
        <h1 className="font-display text-[2.15rem] font-bold leading-[1.03] tracking-[-0.025em] text-[color:var(--text-strong)] sm:text-[2.85rem]">
          {t(dict, "page.biography.title")}
        </h1>
        <div className="space-y-4 text-base leading-[1.8] text-[color:var(--text-body)] sm:text-lg">
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      <HomeMediaRail
        cards={mediaCards}
        labels={{
          kicker: t(dict, "home.media.kicker"),
          title: t(dict, "home.media.title"),
          empty: t(dict, "home.media.empty"),
          previous: t(dict, "home.media.previous"),
          next: t(dict, "home.media.next"),
          play: t(dict, "home.media.play"),
          open: t(dict, "home.media.open"),
          typeLabels: {
            youtube_video: t(dict, "home.media.types.youtube_video"),
            facebook_post: t(dict, "home.media.types.facebook_post"),
            exhibition: t(dict, "home.media.types.exhibition"),
            article: t(dict, "home.media.types.article"),
            site_link: t(dict, "home.media.types.site_link"),
          },
        }}
      />
    </section>
  );
}
