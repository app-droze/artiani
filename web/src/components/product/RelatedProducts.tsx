import Image from "next/image";
import Link from "next/link";
import { products, pick, type Product } from "@/src/data/products";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type RelatedProductsProps = {
  current: Product;
  lang: Locale;
  dict: Dictionary;
};

export const RelatedProducts = ({ current, lang, dict }: RelatedProductsProps) => {
  const related = products
    .filter((item) => item.kind === current.kind && item.slug !== current.slug)
    .slice(0, 4);

  if (related.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight text-black">
        {t(dict, "product.relatedTitle")}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {related.map((item) => (
          <Link
            key={item.id}
            href={`/${lang}/product/${item.slug}`}
            scroll
            className="group rounded-2xl border border-black/10 bg-white p-3"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-black/10 bg-[#f5efe7]">
              <Image
                src={item.image}
                alt={pick(item.name, lang)}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 45vw, 23vw"
                className="object-contain p-3"
              />
            </div>
            <p className="mt-2 text-sm font-medium text-black transition group-hover:text-black/70">
              {pick(item.name, lang)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
};
