import Link from "next/link";
import { products, pick } from "@/src/data/products";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type PageProps = {
  params: Promise<{ lang: Locale }>;
};

export default async function Home({ params }: PageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const featured = products.slice(0, 4);

  return (
    <main className="min-h-screen px-5 pb-24 pt-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-16">
        <section className="space-y-8">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-black/50">
            {t(dict, "home.kicker")}
          </p>
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl">
              {t(dict, "home.title")}
            </h1>
            <p className="max-w-2xl text-base text-black/60">
              {t(dict, "home.subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/${lang}/shop`}
              className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
            >
              {t(dict, "home.cta_shop")}
            </Link>
            <Link
              href="#featured"
              className="rounded-full border border-black px-6 py-3 text-sm font-semibold text-black"
            >
              {t(dict, "home.cta_featured")}
            </Link>
          </div>
        </section>

        <section id="featured" className="space-y-6">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50">
                {t(dict, "home.featured_kicker")}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-black sm:text-3xl">
                {t(dict, "home.featured_title")}
              </h2>
            </div>
            <Link
              href={`/${lang}/shop`}
              className="text-sm font-semibold text-black/70 hover:text-black"
            >
              {t(dict, "home.featured_cta")}
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((product) => (
              <Link
                key={product.id}
                href={`/${lang}/product/${product.slug}`}
                className="group rounded-3xl border border-black/10 bg-white/70 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-black/50">
                  {t(dict, `productTypes.${product.type}`)}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-black">
                  {pick(product.name, lang)}
                </h3>
                <p className="mt-2 text-sm text-black/60">
                  {pick(product.summary, lang)}
                </p>
                <span className="mt-4 inline-flex text-xs font-semibold uppercase tracking-[0.2em] text-black/50 group-hover:text-black">
                  {t(dict, "home.featured_view")}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-8 rounded-3xl border border-black/10 bg-white/70 p-10 md:grid-cols-3">
          {[
            "home.steps.one",
            "home.steps.two",
            "home.steps.three",
          ].map((key, index) => (
            <div key={key} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50">
                {t(dict, "home.steps_label")} {index + 1}
              </p>
              <h3 className="text-lg font-semibold text-black">
                {t(dict, `${key}.title`)}
              </h3>
              <p className="text-sm text-black/60">
                {t(dict, `${key}.body`)}
              </p>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-4 rounded-3xl border border-black/10 bg-white/60 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50">
            {t(dict, "home.bio_kicker")}
          </p>
          <p className="max-w-2xl text-base text-black/60">
            {t(dict, "home.bio_text")}
          </p>
          <Link
            href="#"
            className="text-sm font-semibold uppercase tracking-[0.2em] text-black/60 hover:text-black"
          >
            {t(dict, "home.bio_cta")}
          </Link>
        </section>
      </div>
    </main>
  );
}
