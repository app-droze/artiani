import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import { defaultLocale, isLocale, type Locale } from "@/src/i18n/locales";
import { getAdminSessionCookieName, verifyAdminSessionToken } from "@/src/lib/adminSession";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";

type PackagingCatalogRow = {
  id: string;
  code: string;
  name: string;
  unit_cost: number | null;
  currency: string | null;
  notes: string | null;
  is_active: boolean;
};

const resolveAdminLocale = async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  return cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;
};

const formatMoney = (value: number | null | undefined) => `${value ?? 0} ₾`;

export default async function AdminFulfillmentPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const [cookieStore, locale, params] = await Promise.all([
    cookies(),
    resolveAdminLocale(),
    searchParams,
  ]);
  const hasSession = await verifyAdminSessionToken(
    cookieStore.get(getAdminSessionCookieName())?.value,
  );

  if (!hasSession) {
    redirect("/admin");
  }

  const dict = await getDictionary(locale);
  const resultCode = (params.result ?? "").trim();
  const resultMessage =
    resultCode === "packaging_created"
      ? t(dict, "admin.fulfillment.result.packagingCreated")
      : resultCode === "duplicate_packaging"
        ? t(dict, "admin.fulfillment.result.duplicatePackaging")
        : resultCode === "invalid_fulfillment"
          ? t(dict, "admin.fulfillment.result.invalid")
          : resultCode === "temporary_error"
            ? t(dict, "admin.fulfillment.result.temporaryError")
            : resultCode === "unauthorized"
              ? t(dict, "admin.fulfillment.result.unauthorized")
              : null;
  const resultTone =
    resultCode === "packaging_created"
      ? "text-[#2f6f4f]"
      : resultCode
        ? "text-[#8a2f2f]"
        : null;

  const { data, error } = await getSupabaseAdmin()
    .from("packaging_catalog")
    .select("id, code, name, unit_cost, currency, notes, is_active")
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`[admin.fulfillment] Failed to fetch packaging catalog: ${error.message}`);
  }

  const packagingItems = (data ?? []) as PackagingCatalogRow[];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="ui-overline">{t(dict, "admin.fulfillment.kicker")}</p>
            <h1 className="font-display text-[2rem] leading-tight text-[color:var(--text-strong)]">
              {t(dict, "admin.fulfillment.title")}
            </h1>
            <p className="text-sm leading-7 text-[color:var(--text-body)]">
              {t(dict, "admin.fulfillment.body")}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/dashboard" className="ui-button-secondary whitespace-nowrap">
              {t(dict, "admin.fulfillment.backToDashboard")}
            </Link>
            <Link href="/admin/orders" className="ui-button-secondary whitespace-nowrap">
              {t(dict, "admin.dashboard.ordersLink")}
            </Link>
            <Link href="/admin/reports" className="ui-button-secondary whitespace-nowrap">
              {t(dict, "admin.dashboard.reportsLink")}
            </Link>
            <form action="/api/admin/logout" method="post">
              <button type="submit" className="ui-button-secondary whitespace-nowrap">
                {t(dict, "admin.dashboard.logout")}
              </button>
            </form>
          </div>
        </div>

        {resultMessage && resultTone ? (
          <div className="ui-card border border-[var(--border-soft)] px-5 py-4 sm:px-6">
            <p className={`text-sm leading-6 ${resultTone}`}>{resultMessage}</p>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)]">
          <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-4">
              <div>
                <h2 className="ui-overline">{t(dict, "admin.fulfillment.formTitle")}</h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-body)]">
                  {t(dict, "admin.fulfillment.formBody")}
                </p>
              </div>
              <form action="/api/admin/packaging/catalog" method="post" className="space-y-4">
                <input type="hidden" name="returnTo" value="/admin/fulfillment" />
                <div className="space-y-1.5">
                  <label htmlFor="packaging-code" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                    {t(dict, "admin.fulfillment.form.code")}
                  </label>
                  <input
                    id="packaging-code"
                    name="code"
                    className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="packaging-name" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                    {t(dict, "admin.fulfillment.form.name")}
                  </label>
                  <input
                    id="packaging-name"
                    name="name"
                    className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="packaging-unit-cost" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                    {t(dict, "admin.fulfillment.form.unitCost")}
                  </label>
                  <input
                    id="packaging-unit-cost"
                    name="unitCost"
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="packaging-notes" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                    {t(dict, "admin.fulfillment.form.notes")}
                  </label>
                  <textarea
                    id="packaging-notes"
                    name="notes"
                    rows={3}
                    className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                  />
                </div>
                <button type="submit" className="ui-button-primary whitespace-nowrap">
                  {t(dict, "admin.fulfillment.form.submit")}
                </button>
              </form>
            </div>
          </section>

          <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-4">
              <div>
                <h2 className="ui-overline">{t(dict, "admin.fulfillment.catalogTitle")}</h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-body)]">
                  {t(dict, "admin.fulfillment.catalogBody")}
                </p>
              </div>
              {packagingItems.length > 0 ? (
                <div className="space-y-3">
                  {packagingItems.map((item) => (
                    <div key={item.id} className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <p className="font-medium text-[color:var(--text-strong)]">{item.name}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm leading-6 text-[color:var(--text-muted)]">
                            <span>{t(dict, "admin.fulfillment.catalog.code")}: {item.code}</span>
                            <span>{t(dict, "admin.fulfillment.catalog.cost")}: {formatMoney(item.unit_cost)}</span>
                            <span>{t(dict, "admin.fulfillment.catalog.status")}: {item.is_active ? t(dict, "admin.fulfillment.catalog.active") : t(dict, "admin.fulfillment.catalog.inactive")}</span>
                          </div>
                          {item.notes ? (
                            <p className="text-sm leading-6 text-[color:var(--text-body)]">{item.notes}</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                  {t(dict, "admin.fulfillment.catalog.empty")}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
