import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import { defaultLocale, isLocale, type Locale } from "@/src/i18n/locales";
import { getAdminSessionCookieName, verifyAdminSessionToken } from "@/src/lib/adminSession";

const resolveAdminLocale = async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  return cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;
};

export default async function AdminDashboardPage() {
  const [cookieStore, locale] = await Promise.all([cookies(), resolveAdminLocale()]);
  const hasSession = await verifyAdminSessionToken(
    cookieStore.get(getAdminSessionCookieName())?.value,
  );

  if (!hasSession) {
    redirect("/admin");
  }

  const dict = await getDictionary(locale);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <div className="ui-card border border-[var(--border-soft)] px-6 py-7 sm:px-7 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="ui-overline">{t(dict, "admin.dashboard.kicker")}</p>
              <h1 className="font-display text-[2rem] leading-tight text-[color:var(--text-strong)]">
                {t(dict, "admin.dashboard.title")}
              </h1>
              <p className="text-sm leading-7 text-[color:var(--text-body)]">
                {t(dict, "admin.dashboard.body")}
              </p>
            </div>
            <form action="/api/admin/logout" method="post">
              <div className="flex gap-3">
                <Link href="/admin/orders" className="ui-button-secondary whitespace-nowrap">
                  {t(dict, "admin.dashboard.ordersLink")}
                </Link>
                <Link href="/admin/fulfillment" className="ui-button-secondary whitespace-nowrap">
                  {t(dict, "admin.dashboard.fulfillmentLink")}
                </Link>
                <Link href="/admin/reports" className="ui-button-secondary whitespace-nowrap">
                  {t(dict, "admin.dashboard.reportsLink")}
                </Link>
                <button type="submit" className="ui-button-secondary whitespace-nowrap">
                  {t(dict, "admin.dashboard.logout")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
