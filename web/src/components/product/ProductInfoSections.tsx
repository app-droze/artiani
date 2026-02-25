import type { Product } from "@/src/data/products";
import { pick } from "@/src/data/products";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type ProductInfoSectionsProps = {
  product: Product;
  lang: Locale;
  dict: Dictionary;
  selectedBack: "postcard" | "greeting";
  hasAddText: boolean;
  hasSignature: boolean;
};

export const ProductInfoSections = ({
  product,
  lang,
  dict,
  selectedBack,
  hasAddText,
  hasSignature,
}: ProductInfoSectionsProps) => {
  const details: string[] = [pick(product.summary, lang)];

  if (product.kind === "cards") {
    details.push(
      `${t(dict, "product.cards_back")}: ${
        selectedBack === "postcard"
          ? t(dict, "product.cards_postcard")
          : t(dict, "product.cards_greeting")
      }`,
    );
  }

  if (hasSignature && hasAddText) {
    details.push(
      `${t(dict, "product.personalization_title")}: ${t(dict, "product.option_signature")} + ${t(dict, "product.option_add_text")}`,
    );
  } else if (hasSignature) {
    details.push(
      `${t(dict, "product.personalization_title")}: ${t(dict, "product.option_signature")}`,
    );
  } else if (hasAddText) {
    details.push(
      `${t(dict, "product.personalization_title")}: ${t(dict, "product.option_add_text")}`,
    );
  }

  if (product.kind === "paintings") {
    details.push(t(dict, "auction.badge"));
  }

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-2xl border border-black/10 bg-white p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">
          {t(dict, "product.storyTitle")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-black/70">
          {pick(product.description, lang)}
        </p>
      </article>

      <article className="rounded-2xl border border-black/10 bg-white p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">
          {t(dict, "product.detailsTitle")}
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-black/70">
          {details.map((line, index) => (
            <li key={`${line}-${index}`} className="flex gap-2">
              <span aria-hidden="true" className="mt-1 text-black/50">
                •
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </article>

      <article className="rounded-2xl border border-black/10 bg-white p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">
          {t(dict, "product.deliveryTitle")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-black/70">
          {t(dict, "product.dispatch_note")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-black/70">
          {t(dict, "checkout.reference_note")}
        </p>
      </article>
    </section>
  );
};
