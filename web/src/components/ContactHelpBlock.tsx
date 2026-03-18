import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";

type ContactHelpBlockProps = {
  dict: Dictionary;
  className?: string;
};

const CONTACT_EMAIL = "app.droze@gmail.com";
const CONTACT_PHONE = "+995598194117";

const MailIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
    <path
      d="M4 6.75h16a1.25 1.25 0 0 1 1.25 1.25v8A1.25 1.25 0 0 1 20 17.25H4A1.25 1.25 0 0 1 2.75 16V8A1.25 1.25 0 0 1 4 6.75Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="m3.5 8 8.5 6 8.5-6"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
    <path
      d="M7.8 4.75h1.9c.3 0 .57.18.69.45l1.06 2.63a.76.76 0 0 1-.17.82l-1.34 1.34a13.1 13.1 0 0 0 4.07 4.07l1.34-1.34a.76.76 0 0 1 .82-.17l2.63 1.06c.27.12.45.39.45.69v1.9a1.1 1.1 0 0 1-1.1 1.1h-.8C10.7 19.25 4.75 13.3 4.75 5.85v-.8a1.1 1.1 0 0 1 1.1-1.1Z"
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

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
      <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-2 hover:text-black/72">
        <MailIcon />
        {CONTACT_EMAIL}
      </a>
      <a href={`tel:${CONTACT_PHONE}`} className="inline-flex items-center gap-2 hover:text-black/72">
        <PhoneIcon />
        {CONTACT_PHONE}
      </a>
    </div>
  </div>
);
