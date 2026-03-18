import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";

type ContactHelpBlockProps = {
  dict: Dictionary;
  className?: string;
};

const CONTACT_EMAIL = "app.droze@gmail.com";
const CONTACT_PHONE = "+995598194117";

export const ContactHelpBlock = ({ dict, className = "" }: ContactHelpBlockProps) => (
  <div
    className={`rounded-[1.15rem] border border-black/8 bg-[#f8f5ef] px-4 py-4 text-sm leading-7 text-black/70 ${className}`.trim()}
  >
    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-black/50">
      {t(dict, "contact.helpTitle")}
    </h2>
    <div className="mt-3 space-y-3">
      <p>{t(dict, "contact.helpBodyPrimary")}</p>
      <p>{t(dict, "contact.helpBodySecondary")}</p>
    </div>
    <div className="mt-4 flex flex-col gap-2 text-sm font-medium text-black sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
      <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center hover:text-black/72">
        {CONTACT_EMAIL}
      </a>
      <a href={`tel:${CONTACT_PHONE}`} className="inline-flex items-center hover:text-black/72">
        {CONTACT_PHONE}
      </a>
    </div>
  </div>
);

