import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import { normalizeAdminExpenseCategory } from "@/src/lib/adminExpenseCategory";
import { defaultLocale, isLocale, type Locale } from "@/src/i18n/locales";
import { getAdminSessionCookieName, verifyAdminSessionToken } from "@/src/lib/adminSession";
import { ADMIN_TONES, getSignedMoneyTone } from "@/src/lib/adminUi";
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

type InventoryPurchaseRow = {
  value_delta: number | null;
};

type ReportOrderCard = {
  order_code: string;
  order_date: string;
  customer_name: string;
  items: ReportLineRow[];
  total_qty: number;
  revenue_amount: number;
  product_cost_amount: number;
  courier_cost_amount: number;
  extra_cost_amount: number;
  profit_amount: number;
  has_all_cost_rules: boolean;
  missing_cost_rule_count: number;
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

const buildReportOrderCards = (rows: ReportLineRow[]) => {
  const grouped = new Map<string, ReportOrderCard>();

  for (const row of rows) {
    const existing = grouped.get(row.order_code);

    if (existing) {
      existing.items.push(row);
      existing.total_qty += row.qty;
      existing.revenue_amount += row.line_revenue_amount ?? 0;
      existing.product_cost_amount += row.line_cost_amount ?? 0;
      existing.courier_cost_amount += row.allocated_delivery_cost_amount ?? 0;
      existing.extra_cost_amount += row.allocated_misc_cost_amount ?? 0;
      existing.profit_amount += row.line_profit_amount ?? 0;
      existing.has_all_cost_rules = existing.has_all_cost_rules && row.has_cost_rule;
      if (!row.has_cost_rule) {
        existing.missing_cost_rule_count += 1;
      }
      continue;
    }

    grouped.set(row.order_code, {
      order_code: row.order_code,
      order_date: row.order_date,
      customer_name: row.customer_name,
      items: [row],
      total_qty: row.qty,
      revenue_amount: row.line_revenue_amount ?? 0,
      product_cost_amount: row.line_cost_amount ?? 0,
      courier_cost_amount: row.allocated_delivery_cost_amount ?? 0,
      extra_cost_amount: row.allocated_misc_cost_amount ?? 0,
      profit_amount: row.line_profit_amount ?? 0,
      has_all_cost_rules: row.has_cost_rule,
      missing_cost_rule_count: row.has_cost_rule ? 0 : 1,
    });
  }

  return Array.from(grouped.values());
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
      "order_date, order_code, customer_name, product_type, product_name, product_name_en, product_name_ka, selected_options, qty, line_revenue_amount, line_cost_amount, allocated_delivery_cost_amount, allocated_misc_cost_amount, line_profit_amount, has_cost_rule",
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
      "line_revenue_amount, line_cost_amount, allocated_delivery_cost_amount, allocated_misc_cost_amount, line_profit_amount",
    )
    .gte("order_date", thirtyDayStart);

  const inventoryPurchasesQuery = supabase
    .from("inventory_movements")
    .select("value_delta")
    .eq("movement_type", "purchase")
    .gte("movement_date", thirtyDayStart);

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
    { data: inventoryPurchasesData, error: inventoryPurchasesError },
    { data: businessExpensesData, error: businessExpensesError },
  ] = await Promise.all([
    monthlyQuery,
    linesQuery,
    thirtyDaySummaryQuery,
    inventoryPurchasesQuery,
    businessExpensesQuery,
  ]);

  if (monthlyError) {
    throw new Error(`[admin.reports] Failed to fetch monthly finance: ${monthlyError.message}`);
  }

  if (linesError) {
    throw new Error(`[admin.reports] Failed to fetch report lines: ${linesError.message}`);
  }

  if (thirtyDaySummaryError) {
    throw new Error(`[admin.reports] Failed to fetch 30 day summary: ${thirtyDaySummaryError.message}`);
  }

  if (inventoryPurchasesError) {
    throw new Error(`[admin.reports] Failed to fetch 30 day inventory purchases: ${inventoryPurchasesError.message}`);
  }

  if (businessExpensesError) {
    throw new Error(`[admin.reports] Failed to fetch business expenses: ${businessExpensesError.message}`);
  }

  const monthlyRows = (monthlyData ?? []) as MonthlyFinanceRow[];
  const lineRows = (linesData ?? []) as ReportLineRow[];
  const thirtyDayRows = (thirtyDaySummaryData ?? []) as ThirtyDaySummaryRow[];
  const inventoryPurchaseRows = (inventoryPurchasesData ?? []) as InventoryPurchaseRow[];
  const businessExpenses = (businessExpensesData ?? []) as BusinessExpenseRow[];
  const reportOrderCards = buildReportOrderCards(lineRows);
  const reportReturnTo = buildReportReturnTo(codeFilter);
  const thirtyDayRevenue = thirtyDayRows.reduce((sum, row) => sum + (row.line_revenue_amount ?? 0), 0);
  const thirtyDayCogs = thirtyDayRows.reduce((sum, row) => sum + (row.line_cost_amount ?? 0), 0);
  const thirtyDayStockExpense = inventoryPurchaseRows.reduce((sum, row) => sum + (row.value_delta ?? 0), 0);
  const thirtyDayCourier = thirtyDayRows.reduce((sum, row) => sum + (row.allocated_delivery_cost_amount ?? 0), 0);
  const thirtyDayExtra = thirtyDayRows.reduce((sum, row) => sum + (row.allocated_misc_cost_amount ?? 0), 0);
  const thirtyDayProfit = thirtyDayRows.reduce((sum, row) => sum + (row.line_profit_amount ?? 0), 0);
  const thirtyDayProfitTone = ADMIN_TONES[getSignedMoneyTone(thirtyDayProfit)];

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <Link href="/admin/dashboard" className="ui-button-secondary inline-flex w-fit items-center gap-2 whitespace-nowrap">
              <span aria-hidden="true">&larr;</span>
              <span>{t(dict, "admin.reports.backToDashboard")}</span>
            </Link>
            <p className="ui-overline">{t(dict, "admin.reports.kicker")}</p>
            <h1 className="font-display text-[2rem] leading-tight text-[color:var(--text-strong)]">
              {t(dict, "admin.reports.title")}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-[color:var(--text-body)]">
              {t(dict, "admin.reports.body")}
            </p>
          </div>
        </div>

        {thirtyDayRows.length > 0 ? (
          <section className="space-y-3">
            <div>
              <p className="ui-overline">{t(dict, "admin.reports.cards.last30Days")}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className={`rounded-[1.2rem] border px-4 py-4 ${ADMIN_TONES.income.surface}`}>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.revenue")}</p>
                <p className={`mt-2 text-[1.2rem] font-semibold ${ADMIN_TONES.income.text}`}>{formatMoney(thirtyDayRevenue)}</p>
              </div>
              <div className={`rounded-[1.2rem] border px-4 py-4 ${ADMIN_TONES.expense.surface}`}>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.cogs")}</p>
                <p className={`mt-2 text-[1.2rem] font-semibold ${ADMIN_TONES.expense.text}`}>{formatMoney(thirtyDayCogs)}</p>
              </div>
              <div className={`rounded-[1.2rem] border px-4 py-4 ${ADMIN_TONES.warning.surface}`}>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.stockExpense")}</p>
                <p className={`mt-2 text-[1.2rem] font-semibold ${ADMIN_TONES.warning.text}`}>{formatMoney(thirtyDayStockExpense)}</p>
              </div>
              <div className={`rounded-[1.2rem] border px-4 py-4 ${ADMIN_TONES.info.surface}`}>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.courierExpense")}</p>
                <p className={`mt-2 text-[1.2rem] font-semibold ${ADMIN_TONES.info.text}`}>{formatMoney(thirtyDayCourier)}</p>
              </div>
              <div className={`rounded-[1.2rem] border px-4 py-4 ${ADMIN_TONES.expense.surface}`}>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.orderExtras")}</p>
                <p className={`mt-2 text-[1.2rem] font-semibold ${ADMIN_TONES.expense.text}`}>{formatMoney(thirtyDayExtra)}</p>
              </div>
              <div className={`rounded-[1.2rem] border px-4 py-4 ${thirtyDayProfitTone.surface}`}>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.orderProfit")}</p>
                <p className={`mt-2 text-[1.2rem] font-semibold ${thirtyDayProfitTone.text}`}>{formatMoney(thirtyDayProfit)}</p>
              </div>
            </div>
          </section>
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
                <div className="flex justify-start">
                  <Link href="/admin/expenses" className="ui-button-secondary whitespace-nowrap">
                    {t(dict, "admin.reports.expenses.manage")}
                  </Link>
                </div>

                {businessExpenses.length > 0 ? (
                  <div className="space-y-3">
                    {businessExpenses.map((expense) => (
                      <div key={expense.id} className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-[color:var(--text-strong)]">{expense.description}</p>
                              <p className="text-sm leading-6 text-[color:var(--text-muted)]">{normalizeAdminExpenseCategory(expense.expense_category, locale, dict)}</p>
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

              {reportOrderCards.length > 0 ? (
                <div className="space-y-3">
                  {reportOrderCards.map((order) => (
                    <Link
                      key={order.order_code}
                      href={`/admin/orders/${encodeURIComponent(order.order_code)}?returnTo=${encodeURIComponent(reportReturnTo)}`}
                      className={`block rounded-[1rem] border px-4 py-4 transition-colors hover:border-black/15 hover:bg-white/90 ${order.has_all_cost_rules ? "border-[var(--border-soft)] bg-white/70" : `${ADMIN_TONES.warning.surface} bg-[#fffaf1]`}`}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium text-[color:var(--text-strong)]">{order.order_code}</p>
                            <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                              {order.customer_name}
                              {" · "}
                              {formatDay(order.order_date, locale)}
                            </p>
                          </div>
                          <p className={`text-sm font-medium ${order.has_all_cost_rules ? ADMIN_TONES[getSignedMoneyTone(order.profit_amount)].text : ADMIN_TONES.warning.text}`}>
                            {order.has_all_cost_rules ? formatMoney(order.profit_amount) : `${order.missing_cost_rule_count} ${t(dict, "admin.reports.lines.missingCostRule")}`}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          {order.items.map((item, index) => (
                            <div key={`${order.order_code}-${index}`} className="text-sm leading-6 text-[color:var(--text-body)]">
                              <span className="font-medium text-[color:var(--text-strong)]">{item.qty}× {getProductTitle(item, locale, dict)}</span>
                              {item.selected_options ? ` · ${item.selected_options}` : ""}
                            </div>
                          ))}
                        </div>
                        <div className="grid gap-2 text-sm leading-6 text-[color:var(--text-body)] sm:grid-cols-2 xl:grid-cols-4">
                          <span>{t(dict, "admin.reports.lines.qty")}: {order.total_qty}</span>
                          <span className={ADMIN_TONES.income.text}>{t(dict, "admin.reports.lines.revenue")}: {formatMoney(order.revenue_amount)}</span>
                          <span className={ADMIN_TONES.expense.text}>{t(dict, "admin.reports.lines.productCost")}: {formatMoney(order.product_cost_amount)}</span>
                          <span className={ADMIN_TONES.info.text}>{t(dict, "admin.reports.lines.delivery")}: {formatMoney(order.courier_cost_amount)}</span>
                          <span className={ADMIN_TONES.expense.text}>{t(dict, "admin.reports.lines.extra")}: {formatMoney(order.extra_cost_amount)}</span>
                          <span className={ADMIN_TONES[getSignedMoneyTone(order.profit_amount)].text}>{t(dict, "admin.reports.lines.profit")}: {formatMoney(order.profit_amount)}</span>
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
