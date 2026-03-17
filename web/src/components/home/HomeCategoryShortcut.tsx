import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";

type HomeCategoryShortcutProps = {
  href: string;
  label: string;
  meta: string;
  imageUrl: string | null;
  dict: Dictionary;
};

export const HomeCategoryShortcut = ({
  href,
  label,
  meta,
  imageUrl,
  dict,
}: HomeCategoryShortcutProps) => (
  <Link
    href={href}
    className="group relative overflow-hidden rounded-[1.5rem] border border-black/8 bg-white/78 p-4 transition-colors hover:bg-white sm:p-5"
  >
    <div className="relative z-10 flex min-h-[9.5rem] flex-col justify-between gap-5">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/42">
          {meta}
        </p>
        <h3 className="max-w-[11rem] text-xl font-semibold tracking-tight text-black sm:text-[1.45rem]">
          {label}
        </h3>
      </div>

      <span className="text-sm font-medium text-black/62 transition-transform group-hover:translate-x-0.5">
        {t(dict, "home.categories.cardCta")}
      </span>
    </div>

    {imageUrl ? (
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[46%]">
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/84 to-white/18" />
        <Image
          src={imageUrl}
          alt={label}
          fill
          className="object-contain p-3 opacity-90"
          sizes="(max-width: 640px) 40vw, 18vw"
        />
      </div>
    ) : null}
  </Link>
);
