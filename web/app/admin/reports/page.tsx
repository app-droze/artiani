import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import { defaultLocale, isLocale, type Locale } from "@/src/i18n/locales";
import { getAdminSessionCookieName, verifyAdminSessionToken } from "@/src/lib/adminSession";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";

type MonthlyFinanceRow = {
  finance_month: string;
  order_count: number | null;
  units_sold: number | null;
  gross_revenue_amount: number | null;
  known_cogs_amount: number | null;
  known_fulfillment_cost_amount: number | null;
  known_misc_cost_amount: number | null;
  known_order_profit_amount: number | null;
  known_net_profit_amount: number | null;
  lines_missing_cost_rule: number | null;
};

type ReportLineRow = {
  order_date: string;
  order_code: string;
  customer_name: string;
  product_name: string;
  selected_options: string | null;
  qty: number;
  line_revenue_amount: number | null;
  line_cost_amount: number | null;
  allocated_packaging_cost_amount: number | null;
  allocated_delivery_cost_amount: number | null;
  allocated_misc_cost_amount: number | null;
  line_profit_amount: number | null;
  has_cost_rule: boolean;
};

const resolveAdminLocale = async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  return cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;
};

const formatMoney = (value: number | null | undefined) => `${value ?? 0} ₾`;

const formatMonth = (value: string, locale: Locale) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "ka" ? "ka-GE" : "en-US", {
    year: "numeric",
    month: "short",
  }).format(date);
};

const formatDay = (value: string, locale: Locale) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "ka" ? "ka-GE" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
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
  const codeFilter = (params.code ?? "").trim();
  const supabase = getSupabaseAdmin();

  const monthlyQuery = supabase
    .from("reporting_monthly_finance_v1")
    .select(
      "finance_month, order_count, units_sold, gross_revenue_amount, known_cogs_amount, known_fulfillment_cost_amount, known_misc_cost_amount, known_order_profit_amount, known_net_profit_amount, lines_missing_cost_rule",
    )
    .order("finance_month", { ascending: false })
    .limit(12);

  let linesQuery = supabase
    .from("reporting_order_line_item_profit_v1")
    .select(
      "order_date, order_code, customer_name, product_name, selected_options, qty, line_revenue_amount, line_cost_amount, allocated_packaging_cost_amount, allocated_delivery_cost_amount, allocated_misc_cost_amount, line_profit_amount, has_cost_rule",
    )
    .order("order_created_at_utc", { ascending: false })
    .order("order_item_number", { ascending: false })
    .limit(150);

  if (codeFilter) {
    linesQuery = linesQuery.ilike("order_code", `%${codeFilter}%`);
  }

  const [{ data: monthlyData, error: monthlyError }, { data: linesData, error: linesError }] = await Promise.all([
    monthlyQuery,
    linesQuery,
  ]);

  if (monthlyError) {
    throw new Error(`[admin.reports] Failed to fetch monthly finance: ${monthlyError.message}`);
  }

  if (linesError) {
    throw new Error(`[admin.reports] Failed to fetch report lines: ${linesError.message}`);
  }

  const monthlyRows = (monthlyData ?? []) as MonthlyFinanceRow[];
  const lineRows = (linesData ?? []) as ReportLineRow[];
  const latestMonth = monthlyRows[0] ?? null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <p className="ui-overline">{t(dict, "admin.reports.kicker")}</p>
            <h1 className="font-display text-[2rem] leading-tight text-[color:var(--text-strong)]">
              {t(dict, "admin.reports.title")}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-[color:var(--text-body)]">
              {t(dict, "admin.reports.body")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/dashboard" className="ui-button-secondary whitespace-nowrap">
              {t(dict, "admin.reports.backToDashboard")}
            </Link>
            <Link href="/admin/orders" className="ui-button-secondary whitespace-nowrap">
              {t(dict, "admin.dashboard.ordersLink")}
            </Link>
            <Link href="/admin/fulfillment" className="ui-button-secondary whitespace-nowrap">
              {t(dict, "admin.dashboard.fulfillmentLink")}
            </Link>
            <form action="/api/admin/logout" method="post">
              <button type="submit" className="ui-button-secondary whitespace-nowrap">
                {t(dict, "admin.dashboard.logout")}
              </button>
            </form>
          </div>
        </div>

        {latestMonth ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-[1.2rem] border border-[var(--border-soft)] bg-[#faf6f0] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.month")}</p>
              <p className="mt-2 text-[1.2rem] font-semibold text-[color:var(--text-strong)]">{formatMonth(latestMonth.finance_month, locale)}</p>
            </div>
            <div className="rounded-[1.2rem] border border-[var(--border-soft)] bg-[#faf6f0] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.revenue")}</p>
              <p className="mt-2 text-[1.2rem] font-semibold text-[color:var(--text-strong)]">{formatMoney(latestMonth.gross_revenue_amount)}</p>
            </div>
            <div className="rounded-[1.2rem] border border-[var(--border-soft)] bg-[#faf6f0] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.cogs")}</p>
              <p className="mt-2 text-[1.2rem] font-semibold text-[color:var(--text-strong)]">{formatMoney(latestMonth.known_cogs_amount)}</p>
            </div>
            <div className="rounded-[1.2rem] border border-[var(--border-soft)] bg-[#faf6f0] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.fulfillment")}</p>
              <p className="mt-2 text-[1.2rem] font-semibold text-[color:var(--text-strong)]">
                {formatMoney((latestMonth.known_fulfillment_cost_amount ?? 0) + (latestMonth.known_misc_cost_amount ?? 0))}
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-[var(--border-soft)] bg-[#faf6f0] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.orderProfit")}</p>
              <p className="mt-2 text-[1.2rem] font-semibold text-[color:var(--text-strong)]">{formatMoney(latestMonth.known_order_profit_amount)}</p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
          <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6">
            <div className="space-y-4">
              <div>
                <h2 className="ui-overline">{t(dict, "admin.reports.monthlyTitle")}</h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-body)]">
                  {t(dict, "admin.reports.monthlyBody")}
                </p>
              </div>
              {monthlyRows.length > 0 ? (
                <div className="space-y-3">
                  {monthlyRows.map((row) => (
                    <div key={row.finance_month} className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium text-[color:var(--text-strong)]">{formatMonth(row.finance_month, locale)}</p>
                          <p className="text-sm font-medium text-[color:var(--text-strong)]">{formatMoney(row.known_order_profit_amount)}</p>
                        </div>
                        <div className="grid gap-2 text-sm leading-6 text-[color:var(--text-body)] sm:grid-cols-2">
                          <span>{t(dict, "admin.reports.monthly.orders")}: {row.order_count ?? 0}</span>
                          <span>{t(dict, "admin.reports.monthly.units")}: {row.units_sold ?? 0}</span>
                          <span>{t(dict, "admin.reports.monthly.revenue")}: {formatMoney(row.gross_revenue_amount)}</span>
                          <span>{t(dict, "admin.reports.monthly.cogs")}: {formatMoney(row.known_cogs_amount)}</span>
                          <span>{t(dict, "admin.reports.monthly.fulfillment")}: {formatMoney((row.known_fulfillment_cost_amount ?? 0) + (row.known_misc_cost_amount ?? 0))}</span>
                          <span>{t(dict, "admin.reports.monthly.net")}: {formatMoney(row.known_net_profit_amount)}</span>
                        </div>
                        <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                          {t(dict, "admin.reports.monthly.missingCosts")}: {row.lines_missing_cost_rule ?? 0}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.reports.monthlyEmpty")}</p>
              )}
            </div>
          </section>

          <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6">
            <div className="space-y-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h2 className="ui-overline">{t(dict, "admin.reports.linesTitle")}</h2>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-body)]">
                    {t(dict, "admin.reports.linesBody")}
                  </p>
                </div>
                <form className="flex w-full gap-3 xl:w-auto">
                  <input
                    name="code"
                    defaultValue={codeFilter}
                    placeholder={t(dict, "admin.reports.filter.orderCode")}
                    className="min-w-0 flex-1 rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20 xl:w-[240px]"
                  />
                  <button type="submit" className="ui-button-secondary whitespace-nowrap">
                    {t(dict, "admin.reports.filter.apply")}
                  </button>
                </form>
              </div>

              {lineRows.length > 0 ? (
                <div className="space-y-3">
                  {lineRows.map((row, index) => (
                    <div key={`${row.order_code}-${index}`} className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium text-[color:var(--text-strong)]">{row.product_name}</p>
                            <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                              <Link href={`/admin/orders/${encodeURIComponent(row.order_code)}`} className="underline underline-offset-4">
                                {row.order_code}
                              </Link>
                              {" · "}
                              {row.customer_name}
                              {" · "}
                              {formatDay(row.order_date, locale)}
                            </p>
                          </div>
                          <p className={`text-sm font-medium ${row.has_cost_rule ? "text-[color:var(--text-strong)]" : "text-[#8a2f2f]"}`}>
                            {row.has_cost_rule ? formatMoney(row.line_profit_amount) : t(dict, "admin.reports.lines.missingCostRule")}
                          </p>
                        </div>
                        {row.selected_options ? (
                          <p className="text-sm leading-6 text-[color:var(--text-body)]">{row.selected_options}</p>
                        ) : null}
                        <div className="grid gap-2 text-sm leading-6 text-[color:var(--text-body)] sm:grid-cols-2 xl:grid-cols-4">
                          <span>{t(dict, "admin.reports.lines.qty")}: {row.qty}</span>
                          <span>{t(dict, "admin.reports.lines.revenue")}: {formatMoney(row.line_revenue_amount)}</span>
                          <span>{t(dict, "admin.reports.lines.productCost")}: {formatMoney(row.line_cost_amount)}</span>
                          <span>{t(dict, "admin.reports.lines.packaging")}: {formatMoney(row.allocated_packaging_cost_amount)}</span>
                          <span>{t(dict, "admin.reports.lines.delivery")}: {formatMoney(row.allocated_delivery_cost_amount)}</span>
                          <span>{t(dict, "admin.reports.lines.extra")}: {formatMoney(row.allocated_misc_cost_amount)}</span>
                          <span>{t(dict, "admin.reports.lines.profit")}: {formatMoney(row.line_profit_amount)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.reports.linesEmpty")}</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
