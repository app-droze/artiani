import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import { defaultLocale, isLocale, type Locale } from "@/src/i18n/locales";
import { getAdminSessionCookieName, verifyAdminSessionToken } from "@/src/lib/adminSession";
import { ADMIN_TONES, getAdminFeedbackTone, getSignedMoneyTone } from "@/src/lib/adminUi";
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

type ThirtyDaySummaryRow = {
  line_revenue_amount: number | null;
  line_cost_amount: number | null;
  allocated_packaging_cost_amount: number | null;
  allocated_delivery_cost_amount: number | null;
  allocated_misc_cost_amount: number | null;
  line_profit_amount: number | null;
};

type ReportLineRow = {
  order_date: string;
  order_code: string;
  customer_name: string;
  product_type: string | null;
  product_name: string;
  product_name_en: string | null;
  product_name_ka: string | null;
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

type BusinessExpenseRow = {
  id: string;
  incurred_on: string;
  expense_category: string;
  description: string;
  amount: number | null;
  vendor: string | null;
  notes: string | null;
};

const resolveAdminLocale = async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  return cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;
};

const formatMoney = (value: number | null | undefined) => `${value ?? 0} ₾`;

const subtractDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

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

const buildReportReturnTo = (codeFilter: string) => {
  const params = new URLSearchParams();
  if (codeFilter) {
    params.set("code", codeFilter);
  }
  const query = params.toString();
  return query ? `/admin/reports?${query}` : "/admin/reports";
};

const getProductTitle = (row: ReportLineRow, locale: Locale, dict: Record<string, string>) => {
  const localizedName =
    locale === "ka"
      ? row.product_name_ka ?? row.product_name_en ?? row.product_name
      : row.product_name_en ?? row.product_name_ka ?? row.product_name;
  const typeLabel = row.product_type ? (dict[`catalogue.types.${row.product_type}`] ?? row.product_type) : null;
  return typeLabel ? `${typeLabel} - ${localizedName}` : localizedName;
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; result?: string }>;
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
  const resultCode = (params.result ?? "").trim();
  const supabase = getSupabaseAdmin();
  const thirtyDayStart = subtractDays(new Date(), 30).toISOString().slice(0, 10);

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
      "order_date, order_code, customer_name, product_type, product_name, product_name_en, product_name_ka, selected_options, qty, line_revenue_amount, line_cost_amount, allocated_packaging_cost_amount, allocated_delivery_cost_amount, allocated_misc_cost_amount, line_profit_amount, has_cost_rule",
    )
    .order("order_created_at_utc", { ascending: false })
    .order("order_item_number", { ascending: false })
    .limit(150);

  if (codeFilter) {
    linesQuery = linesQuery.ilike("order_code", `%${codeFilter}%`);
  }

  const thirtyDaySummaryQuery = supabase
    .from("reporting_order_line_item_profit_v1")
    .select(
      "line_revenue_amount, line_cost_amount, allocated_packaging_cost_amount, allocated_delivery_cost_amount, allocated_misc_cost_amount, line_profit_amount",
    )
    .gte("order_date", thirtyDayStart);

  const businessExpensesQuery = supabase
    .from("business_expenses")
    .select("id, incurred_on, expense_category, description, amount, vendor, notes")
    .order("incurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  const [
    { data: monthlyData, error: monthlyError },
    { data: linesData, error: linesError },
    { data: thirtyDaySummaryData, error: thirtyDaySummaryError },
    { data: businessExpensesData, error: businessExpensesError },
  ] = await Promise.all([monthlyQuery, linesQuery, thirtyDaySummaryQuery, businessExpensesQuery]);

  if (monthlyError) {
    throw new Error(`[admin.reports] Failed to fetch monthly finance: ${monthlyError.message}`);
  }

  if (linesError) {
    throw new Error(`[admin.reports] Failed to fetch report lines: ${linesError.message}`);
  }

  if (thirtyDaySummaryError) {
    throw new Error(`[admin.reports] Failed to fetch 30 day summary: ${thirtyDaySummaryError.message}`);
  }

  if (businessExpensesError) {
    throw new Error(`[admin.reports] Failed to fetch business expenses: ${businessExpensesError.message}`);
  }

  const monthlyRows = (monthlyData ?? []) as MonthlyFinanceRow[];
  const lineRows = (linesData ?? []) as ReportLineRow[];
  const thirtyDayRows = (thirtyDaySummaryData ?? []) as ThirtyDaySummaryRow[];
  const businessExpenses = (businessExpensesData ?? []) as BusinessExpenseRow[];
  const reportReturnTo = buildReportReturnTo(codeFilter);
  const thirtyDayRevenue = thirtyDayRows.reduce((sum, row) => sum + (row.line_revenue_amount ?? 0), 0);
  const thirtyDayCogs = thirtyDayRows.reduce((sum, row) => sum + (row.line_cost_amount ?? 0), 0);
  const thirtyDayFulfillment = thirtyDayRows.reduce(
    (sum, row) =>
      sum +
      (row.allocated_packaging_cost_amount ?? 0) +
      (row.allocated_delivery_cost_amount ?? 0) +
      (row.allocated_misc_cost_amount ?? 0),
    0,
  );
  const thirtyDayProfit = thirtyDayRows.reduce((sum, row) => sum + (row.line_profit_amount ?? 0), 0);
  const resultMessage =
    resultCode === "expense_added"
      ? t(dict, "admin.reports.expenses.result.added")
      : resultCode === "invalid_expense"
        ? t(dict, "admin.reports.expenses.result.invalid")
        : resultCode === "unauthorized"
          ? t(dict, "admin.reports.expenses.result.unauthorized")
          : resultCode === "temporary_error"
            ? t(dict, "admin.reports.expenses.result.temporaryError")
            : null;
  const resultTone =
    resultCode === "expense_added"
      ? ADMIN_TONES[getAdminFeedbackTone(true)]
      : resultCode
        ? ADMIN_TONES[getAdminFeedbackTone(false)]
        : null;
  const thirtyDayProfitTone = ADMIN_TONES[getSignedMoneyTone(thirtyDayProfit)];

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

        {thirtyDayRows.length > 0 ? (
          <section className="space-y-3">
            <div>
              <p className="ui-overline">{t(dict, "admin.reports.cards.last30Days")}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className={`rounded-[1.2rem] border px-4 py-4 ${ADMIN_TONES.income.surface}`}>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.revenue")}</p>
                <p className={`mt-2 text-[1.2rem] font-semibold ${ADMIN_TONES.income.text}`}>{formatMoney(thirtyDayRevenue)}</p>
              </div>
              <div className={`rounded-[1.2rem] border px-4 py-4 ${ADMIN_TONES.expense.surface}`}>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.cogs")}</p>
                <p className={`mt-2 text-[1.2rem] font-semibold ${ADMIN_TONES.expense.text}`}>{formatMoney(thirtyDayCogs)}</p>
              </div>
              <div className={`rounded-[1.2rem] border px-4 py-4 ${ADMIN_TONES.warning.surface}`}>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.fulfillment")}</p>
                <p className={`mt-2 text-[1.2rem] font-semibold ${ADMIN_TONES.warning.text}`}>
                  {formatMoney(thirtyDayFulfillment)}
                </p>
              </div>
              <div className={`rounded-[1.2rem] border px-4 py-4 ${thirtyDayProfitTone.surface}`}>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.orderProfit")}</p>
                <p className={`mt-2 text-[1.2rem] font-semibold ${thirtyDayProfitTone.text}`}>{formatMoney(thirtyDayProfit)}</p>
              </div>
            </div>
          </section>
        ) : null}

        {resultMessage && resultTone ? (
          <div className={`ui-card border px-5 py-4 sm:px-6 ${resultTone.surface}`}>
            <p className={`text-sm leading-6 ${resultTone.text}`}>{resultMessage}</p>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
          <div className="space-y-6">
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
                            <p className={`text-sm font-medium ${ADMIN_TONES[getSignedMoneyTone(row.known_order_profit_amount)].text}`}>{formatMoney(row.known_order_profit_amount)}</p>
                          </div>
                          <div className="grid gap-2 text-sm leading-6 text-[color:var(--text-body)] sm:grid-cols-2">
                            <span>{t(dict, "admin.reports.monthly.orders")}: {row.order_count ?? 0}</span>
                            <span>{t(dict, "admin.reports.monthly.units")}: {row.units_sold ?? 0}</span>
                            <span className={ADMIN_TONES.income.text}>{t(dict, "admin.reports.monthly.revenue")}: {formatMoney(row.gross_revenue_amount)}</span>
                            <span className={ADMIN_TONES.expense.text}>{t(dict, "admin.reports.monthly.cogs")}: {formatMoney(row.known_cogs_amount)}</span>
                            <span className={ADMIN_TONES.warning.text}>{t(dict, "admin.reports.monthly.fulfillment")}: {formatMoney((row.known_fulfillment_cost_amount ?? 0) + (row.known_misc_cost_amount ?? 0))}</span>
                            <span className={ADMIN_TONES[getSignedMoneyTone(row.known_net_profit_amount)].text}>{t(dict, "admin.reports.monthly.net")}: {formatMoney(row.known_net_profit_amount)}</span>
                          </div>
                          <p className={`text-sm leading-6 ${(row.lines_missing_cost_rule ?? 0) > 0 ? ADMIN_TONES.warning.text : "text-[color:var(--text-muted)]"}`}>
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
              <div className="space-y-5">
                <div>
                  <h2 className="ui-overline">{t(dict, "admin.reports.expenses.title")}</h2>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-body)]">
                    {t(dict, "admin.reports.expenses.body")}
                  </p>
                </div>

                <form action="/api/admin/expenses" method="post" className={`space-y-4 rounded-[1rem] border px-4 py-4 ${ADMIN_TONES.expense.surface}`}>
                  <input type="hidden" name="returnTo" value={reportReturnTo} />
                  <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                    <div className="space-y-1.5">
                      <label htmlFor="expense-date" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                        {t(dict, "admin.reports.expenses.form.incurredOn")}
                      </label>
                      <input
                        id="expense-date"
                        name="incurredOn"
                        type="date"
                        className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="expense-category" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                        {t(dict, "admin.reports.expenses.form.category")}
                      </label>
                      <input
                        id="expense-category"
                        name="expenseCategory"
                        className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="expense-description" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.reports.expenses.form.description")}
                    </label>
                    <input
                      id="expense-description"
                      name="description"
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                    <div className="space-y-1.5">
                      <label htmlFor="expense-amount" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                        {t(dict, "admin.reports.expenses.form.amount")}
                      </label>
                      <input
                        id="expense-amount"
                        name="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="expense-vendor" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                        {t(dict, "admin.reports.expenses.form.vendor")}
                      </label>
                      <input
                        id="expense-vendor"
                        name="vendor"
                        className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="expense-notes" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.reports.expenses.form.notes")}
                    </label>
                    <input
                      id="expense-notes"
                      name="notes"
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>

                  <button type="submit" className="ui-button-secondary whitespace-nowrap">
                    {t(dict, "admin.reports.expenses.form.submit")}
                  </button>
                </form>

                {businessExpenses.length > 0 ? (
                  <div className="space-y-3">
                    {businessExpenses.map((expense) => (
                      <div key={expense.id} className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-[color:var(--text-strong)]">{expense.description}</p>
                              <p className="text-sm leading-6 text-[color:var(--text-muted)]">{expense.expense_category}</p>
                            </div>
                            <p className={`text-sm font-medium ${ADMIN_TONES.expense.text}`}>{formatMoney(expense.amount)}</p>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm leading-6 text-[color:var(--text-muted)]">
                            <span>{formatDay(expense.incurred_on, locale)}</span>
                            {expense.vendor ? <span>{expense.vendor}</span> : null}
                          </div>
                          {expense.notes ? (
                            <p className="text-sm leading-6 text-[color:var(--text-body)]">{expense.notes}</p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.reports.expenses.empty")}</p>
                )}
              </div>
            </section>
          </div>

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
                    <Link
                      key={`${row.order_code}-${index}`}
                      href={`/admin/orders/${encodeURIComponent(row.order_code)}?returnTo=${encodeURIComponent(reportReturnTo)}`}
                      className={`block rounded-[1rem] border px-4 py-4 transition-colors hover:border-black/15 hover:bg-white/90 ${row.has_cost_rule ? "border-[var(--border-soft)] bg-white/70" : `${ADMIN_TONES.warning.surface} bg-[#fffaf1]`}`}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium text-[color:var(--text-strong)]">{getProductTitle(row, locale, dict)}</p>
                            <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                              {row.order_code}
                              {" · "}
                              {row.customer_name}
                              {" · "}
                              {formatDay(row.order_date, locale)}
                            </p>
                          </div>
                          <p className={`text-sm font-medium ${row.has_cost_rule ? ADMIN_TONES[getSignedMoneyTone(row.line_profit_amount)].text : ADMIN_TONES.warning.text}`}>
                            {row.has_cost_rule ? formatMoney(row.line_profit_amount) : t(dict, "admin.reports.lines.missingCostRule")}
                          </p>
                        </div>
                        {row.selected_options ? (
                          <p className="text-sm leading-6 text-[color:var(--text-body)]">{row.selected_options}</p>
                        ) : null}
                        <div className="grid gap-2 text-sm leading-6 text-[color:var(--text-body)] sm:grid-cols-2 xl:grid-cols-4">
                          <span>{t(dict, "admin.reports.lines.qty")}: {row.qty}</span>
                          <span className={ADMIN_TONES.income.text}>{t(dict, "admin.reports.lines.revenue")}: {formatMoney(row.line_revenue_amount)}</span>
                          <span className={ADMIN_TONES.expense.text}>{t(dict, "admin.reports.lines.productCost")}: {formatMoney(row.line_cost_amount)}</span>
                          <span className={ADMIN_TONES.warning.text}>{t(dict, "admin.reports.lines.packaging")}: {formatMoney(row.allocated_packaging_cost_amount)}</span>
                          <span className={ADMIN_TONES.info.text}>{t(dict, "admin.reports.lines.delivery")}: {formatMoney(row.allocated_delivery_cost_amount)}</span>
                          <span className={ADMIN_TONES.expense.text}>{t(dict, "admin.reports.lines.extra")}: {formatMoney(row.allocated_misc_cost_amount)}</span>
                          <span className={ADMIN_TONES[getSignedMoneyTone(row.line_profit_amount)].text}>{t(dict, "admin.reports.lines.profit")}: {formatMoney(row.line_profit_amount)}</span>
                        </div>
                      </div>
                    </Link>
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
