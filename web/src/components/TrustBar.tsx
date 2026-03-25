import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";

type TrustBarProps = {
  dict: Dictionary;
};

const trustItems = [
  "home.trust.transfer",
  "home.trust.collectible",
  "home.trust.support",
  "home.trust.georgia",
] as const;

export const TrustBar = ({ dict }: TrustBarProps) => (
  <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
    {trustItems.map((key) => (
      <div
        key={key}
        className="rounded-[14px] border border-[var(--border-soft)] bg-[#f7f1e8]/82 px-3 py-3 text-[11px] font-medium leading-5 text-[color:var(--text-body)] sm:px-4 sm:text-[13px] sm:leading-6"
      >
        {t(dict, key)}
      </div>
    ))}
  </div>
);
