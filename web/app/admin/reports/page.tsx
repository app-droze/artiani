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
  operating_expenses_amount: number | null;
  lines_missing_cost_rule: number | null;
};

type ThirtyDaySummaryRow = {
  recognized_line_revenue_with_shipping_amount: number | null;
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
  movement_date: string;
  value_delta: number | null;
};

type UnpaidOrderRow = {
  id: string;
  total_amount: number | null;
};

type PendingCourierOrderRow = {
  id: string;
  shipping_amount: number | null;
};

type DeliveryCostRow = {
  order_id: string;
  amount: number | string | null;
};

type MonthlyFinanceCard = MonthlyFinanceRow & {
  stock_expense_amount: number;
  cash_result_amount: number;
};

const SALE_RECOGNIZED_STATUSES = ["paid", "processing", "shipped", "completed"] as const;
const COURIER_RECOGNIZED_STATUSES = ["shipped", "completed"] as const;

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

const toMonthKey = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}-01`;
};

export default async function AdminReportsPage() {
  const [cookieStore, locale] = await Promise.all([
    cookies(),
    resolveAdminLocale(),
  ]);
  const hasSession = await verifyAdminSessionToken(
    cookieStore.get(getAdminSessionCookieName())?.value,
  );

  if (!hasSession) {
    redirect("/admin");
  }

  const dict = await getDictionary(locale);
  const supabase = getSupabaseAdmin();
  const thirtyDayStart = subtractDays(new Date(), 30).toISOString().slice(0, 10);

  const [
    { data: monthlyData, error: monthlyError },
    { data: thirtyDaySummaryData, error: thirtyDaySummaryError },
    { data: thirtyDayInventoryPurchasesData, error: thirtyDayInventoryPurchasesError },
    { data: monthlyInventoryPurchasesData, error: monthlyInventoryPurchasesError },
    { data: businessExpensesData, error: businessExpensesError },
    { data: thirtyDayBusinessExpensesData, error: thirtyDayBusinessExpensesError },
    { data: unpaidOrdersData, error: unpaidOrdersError },
    { data: pendingCourierOrdersData, error: pendingCourierOrdersError },
  ] = await Promise.all([
    supabase
      .from("reporting_monthly_finance_v1")
      .select(
        "finance_month, order_count, units_sold, gross_revenue_amount, known_cogs_amount, known_fulfillment_cost_amount, known_misc_cost_amount, known_order_profit_amount, known_net_profit_amount, operating_expenses_amount, lines_missing_cost_rule",
      )
      .order("finance_month", { ascending: false })
      .limit(12),
    supabase
      .from("reporting_order_line_item_profit_v1")
      .select(
        "recognized_line_revenue_with_shipping_amount, line_cost_amount, allocated_delivery_cost_amount, allocated_misc_cost_amount, line_profit_amount, has_cost_rule",
      )
      .gte("order_date", thirtyDayStart)
      .in("order_status", [...SALE_RECOGNIZED_STATUSES]),
    supabase
      .from("inventory_movements")
      .select("movement_date, value_delta")
      .eq("movement_type", "purchase")
      .gte("movement_date", thirtyDayStart),
    supabase
      .from("inventory_movements")
      .select("movement_date, value_delta")
      .eq("movement_type", "purchase"),
    supabase
      .from("business_expenses")
      .select("id, incurred_on, expense_category, description, amount, vendor, notes")
      .order("incurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("business_expenses")
      .select("amount")
      .gte("incurred_on", thirtyDayStart),
    supabase
      .from("orders")
      .select("id, total_amount")
      .in("status", ["pending", "awaiting_payment"]),
    supabase
      .from("orders")
      .select("id, shipping_amount")
      .in("status", SALE_RECOGNIZED_STATUSES.filter((status) => !COURIER_RECOGNIZED_STATUSES.includes(status as typeof COURIER_RECOGNIZED_STATUSES[number]))),
  ]);

  if (monthlyError) {
    throw new Error(`[admin.reports] Failed to fetch monthly finance: ${monthlyError.message}`);
  }
  if (thirtyDaySummaryError) {
    throw new Error(`[admin.reports] Failed to fetch 30 day summary: ${thirtyDaySummaryError.message}`);
  }
  if (thirtyDayInventoryPurchasesError) {
    throw new Error(`[admin.reports] Failed to fetch 30 day inventory purchases: ${thirtyDayInventoryPurchasesError.message}`);
  }
  if (monthlyInventoryPurchasesError) {
    throw new Error(`[admin.reports] Failed to fetch monthly inventory purchases: ${monthlyInventoryPurchasesError.message}`);
  }
  if (businessExpensesError) {
    throw new Error(`[admin.reports] Failed to fetch business expenses: ${businessExpensesError.message}`);
  }
  if (thirtyDayBusinessExpensesError) {
    throw new Error(`[admin.reports] Failed to fetch 30 day business expenses: ${thirtyDayBusinessExpensesError.message}`);
  }
  if (unpaidOrdersError) {
    throw new Error(`[admin.reports] Failed to fetch unpaid orders: ${unpaidOrdersError.message}`);
  }
  if (pendingCourierOrdersError) {
    throw new Error(`[admin.reports] Failed to fetch pending courier orders: ${pendingCourierOrdersError.message}`);
  }

  const pendingCourierOrderIds = (pendingCourierOrdersData ?? []).map((row) => row.id);
  const { data: pendingCourierDeliveryCostsData, error: pendingCourierDeliveryCostsError } =
    pendingCourierOrderIds.length > 0
      ? await supabase
          .from("order_delivery_costs")
          .select("order_id, amount")
          .in("order_id", pendingCourierOrderIds)
      : { data: [], error: null };

  if (pendingCourierDeliveryCostsError) {
    throw new Error(`[admin.reports] Failed to fetch pending courier delivery costs: ${pendingCourierDeliveryCostsError.message}`);
  }

  const monthlyRows = (monthlyData ?? []) as MonthlyFinanceRow[];
  const thirtyDayRows = (thirtyDaySummaryData ?? []) as ThirtyDaySummaryRow[];
  const thirtyDayInventoryPurchaseRows = (thirtyDayInventoryPurchasesData ?? []) as InventoryPurchaseRow[];
  const monthlyInventoryPurchaseRows = (monthlyInventoryPurchasesData ?? []) as InventoryPurchaseRow[];
  const businessExpenses = (businessExpensesData ?? []) as BusinessExpenseRow[];
  const thirtyDayBusinessExpenseRows = (thirtyDayBusinessExpensesData ?? []) as Pick<BusinessExpenseRow, "amount">[];
  const unpaidOrders = (unpaidOrdersData ?? []) as UnpaidOrderRow[];
  const pendingCourierOrders = (pendingCourierOrdersData ?? []) as PendingCourierOrderRow[];
  const pendingCourierDeliveryCosts = (pendingCourierDeliveryCostsData ?? []) as DeliveryCostRow[];

  const monthlyStockExpenseByMonth = new Map<string, number>();
  for (const row of monthlyInventoryPurchaseRows) {
    const monthKey = toMonthKey(row.movement_date);
    monthlyStockExpenseByMonth.set(
      monthKey,
      (monthlyStockExpenseByMonth.get(monthKey) ?? 0) + (row.value_delta ?? 0),
    );
  }

  const monthlyCards = (() => {
    const rowsByMonth = new Map<string, MonthlyFinanceCard>();

    for (const row of monthlyRows) {
      const stockExpenseAmount = monthlyStockExpenseByMonth.get(row.finance_month) ?? 0;
      rowsByMonth.set(row.finance_month, {
        ...row,
        stock_expense_amount: stockExpenseAmount,
        cash_result_amount:
          (row.known_order_profit_amount ?? 0) -
          (row.operating_expenses_amount ?? 0) -
          stockExpenseAmount,
      });
    }

    for (const [monthKey, stockExpenseAmount] of monthlyStockExpenseByMonth.entries()) {
      if (rowsByMonth.has(monthKey)) {
        continue;
      }

      rowsByMonth.set(monthKey, {
        finance_month: monthKey,
        order_count: 0,
        units_sold: 0,
        gross_revenue_amount: 0,
        known_cogs_amount: 0,
        known_fulfillment_cost_amount: 0,
        known_misc_cost_amount: 0,
        known_order_profit_amount: 0,
        known_net_profit_amount: 0,
        operating_expenses_amount: 0,
        lines_missing_cost_rule: 0,
        stock_expense_amount: stockExpenseAmount,
        cash_result_amount: -stockExpenseAmount,
      });
    }

    return Array.from(rowsByMonth.values()).sort((left, right) =>
      right.finance_month.localeCompare(left.finance_month),
    );
  })();

  const thirtyDayRevenue = thirtyDayRows.reduce(
    (sum, row) => sum + (row.recognized_line_revenue_with_shipping_amount ?? 0),
    0,
  );
  const thirtyDayProductExpense = thirtyDayRows.reduce((sum, row) => sum + (row.line_cost_amount ?? 0), 0);
  const thirtyDayCourier = thirtyDayRows.reduce((sum, row) => sum + (row.allocated_delivery_cost_amount ?? 0), 0);
  const thirtyDayExtra = thirtyDayRows.reduce((sum, row) => sum + (row.allocated_misc_cost_amount ?? 0), 0);
  const thirtyDayOrderProfit = thirtyDayRows.reduce((sum, row) => sum + (row.line_profit_amount ?? 0), 0);
  const thirtyDayStockExpense = thirtyDayInventoryPurchaseRows.reduce((sum, row) => sum + (row.value_delta ?? 0), 0);
  const thirtyDayOperatingExpenses = thirtyDayBusinessExpenseRows.reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const thirtyDayCashResult = thirtyDayOrderProfit - thirtyDayOperatingExpenses - thirtyDayStockExpense;
  const unpaidOrderCount = unpaidOrders.length;
  const unpaidOrderValue = unpaidOrders.reduce((sum, row) => sum + (row.total_amount ?? 0), 0);
  const thirtyDayMissingCostRules = thirtyDayRows.filter((row) => !row.has_cost_rule).length;
  const explicitPendingCourierByOrder = new Map<string, number>();
  for (const entry of pendingCourierDeliveryCosts) {
    explicitPendingCourierByOrder.set(
      entry.order_id,
      (explicitPendingCourierByOrder.get(entry.order_id) ?? 0) + Number(entry.amount ?? 0),
    );
  }
  const pendingCourierAmount = pendingCourierOrders.reduce((sum, row) => {
    const explicitAmount = explicitPendingCourierByOrder.get(row.id);
    return sum + (explicitAmount ?? row.shipping_amount ?? 0);
  }, 0);
  const cashResultTone = ADMIN_TONES[getSignedMoneyTone(thirtyDayCashResult)];
  const orderProfitTone = ADMIN_TONES[getSignedMoneyTone(thirtyDayOrderProfit)];

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

        <section className="space-y-3">
          <p className="ui-overline">{t(dict, "admin.reports.cards.last30Days")}</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className={`rounded-[1.1rem] border px-3.5 py-3 ${ADMIN_TONES.income.surface}`}>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.recognizedRevenue")}</p>
              <p className={`mt-1.5 text-[1.05rem] font-semibold ${ADMIN_TONES.income.text}`}>{formatMoney(thirtyDayRevenue)}</p>
            </div>
            <div className={`rounded-[1.1rem] border px-3.5 py-3 ${orderProfitTone.surface}`}>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.orderProfit")}</p>
              <p className={`mt-1.5 text-[1.05rem] font-semibold ${orderProfitTone.text}`}>{formatMoney(thirtyDayOrderProfit)}</p>
            </div>
            <div className={`rounded-[1.1rem] border px-3.5 py-3 ${ADMIN_TONES.warning.surface}`}>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.stockExpense")}</p>
              <p className={`mt-1.5 text-[1.05rem] font-semibold ${ADMIN_TONES.warning.text}`}>{formatMoney(thirtyDayStockExpense)}</p>
            </div>
            <div className={`rounded-[1.1rem] border px-3.5 py-3 ${ADMIN_TONES.expense.surface}`}>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.operatingExpenses")}</p>
              <p className={`mt-1.5 text-[1.05rem] font-semibold ${ADMIN_TONES.expense.text}`}>{formatMoney(thirtyDayOperatingExpenses)}</p>
            </div>
            <div className={`rounded-[1.1rem] border px-3.5 py-3 ${cashResultTone.surface}`}>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.cashResult")}</p>
              <p className={`mt-1.5 text-[1.05rem] font-semibold ${cashResultTone.text}`}>{formatMoney(thirtyDayCashResult)}</p>
            </div>
            <div className={`rounded-[1.1rem] border px-3.5 py-3 ${ADMIN_TONES.warning.surface}`}>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.awaitingPayment")}</p>
              <p className={`mt-1.5 text-[1.05rem] font-semibold ${ADMIN_TONES.warning.text}`}>{formatMoney(unpaidOrderValue)}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="space-y-6">
            <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6">
              <div className="space-y-4">
                <div>
                  <h2 className="ui-overline">{t(dict, "admin.reports.recognition.title")}</h2>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-body)]">
                    {t(dict, "admin.reports.recognition.body")}
                  </p>
                </div>
                <div className="space-y-3 text-sm leading-6 text-[color:var(--text-body)]">
                  <div className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                    <p className="font-medium text-[color:var(--text-strong)]">{t(dict, "admin.reports.recognition.salesTitle")}</p>
                    <p className="mt-1 text-[color:var(--text-body)]">{t(dict, "admin.reports.recognition.salesRule")}</p>
                  </div>
                  <div className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                    <p className="font-medium text-[color:var(--text-strong)]">{t(dict, "admin.reports.recognition.courierTitle")}</p>
                    <p className="mt-1 text-[color:var(--text-body)]">{t(dict, "admin.reports.recognition.courierRule")}</p>
                  </div>
                  <div className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                    <p className="font-medium text-[color:var(--text-strong)]">{t(dict, "admin.reports.recognition.cashTitle")}</p>
                    <p className="mt-1 text-[color:var(--text-body)]">{t(dict, "admin.reports.recognition.cashRule")}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="ui-overline">{t(dict, "admin.reports.pending.title")}</h2>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--text-body)]">
                      {t(dict, "admin.reports.pending.body")}
                    </p>
                  </div>
                  <Link href="/admin/orders" className="ui-button-secondary whitespace-nowrap">
                    {t(dict, "admin.reports.pending.openOrders")}
                  </Link>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-[color:var(--text-strong)]">{t(dict, "admin.reports.pending.unpaidOrders")}</p>
                        <p className="mt-1 text-sm leading-6 text-[color:var(--text-body)]">
                          {t(dict, "admin.reports.pending.unpaidOrdersBody")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-base font-semibold whitespace-nowrap ${ADMIN_TONES.warning.text}`}>{formatMoney(unpaidOrderValue)}</p>
                        <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                          {unpaidOrderCount} {t(dict, "admin.reports.pending.ordersCount")}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-[color:var(--text-strong)]">{t(dict, "admin.reports.pending.courierTitle")}</p>
                        <p className="mt-1 text-sm leading-6 text-[color:var(--text-body)]">
                          {t(dict, "admin.reports.pending.courierBody")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-base font-semibold whitespace-nowrap ${ADMIN_TONES.info.text}`}>{formatMoney(pendingCourierAmount)}</p>
                        <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                          {pendingCourierOrders.length} {t(dict, "admin.reports.pending.ordersCount")}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-[color:var(--text-strong)]">{t(dict, "admin.reports.pending.missingCosts")}</p>
                        <p className="mt-1 text-sm leading-6 text-[color:var(--text-body)]">
                          {t(dict, "admin.reports.pending.missingCostsBody")}
                        </p>
                      </div>
                      <p className={`text-base font-semibold whitespace-nowrap ${thirtyDayMissingCostRules > 0 ? ADMIN_TONES.warning.text : ADMIN_TONES.neutral.text}`}>
                        {thirtyDayMissingCostRules}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6">
              <div className="space-y-4">
                <div>
                  <h2 className="ui-overline">{t(dict, "admin.reports.breakdownTitle")}</h2>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-body)]">
                    {t(dict, "admin.reports.breakdownBody")}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={`rounded-[1rem] border px-4 py-4 ${ADMIN_TONES.expense.surface}`}>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.cogs")}</p>
                    <p className={`mt-2 text-[1.1rem] font-semibold whitespace-nowrap ${ADMIN_TONES.expense.text}`}>{formatMoney(thirtyDayProductExpense)}</p>
                  </div>
                  <div className={`rounded-[1rem] border px-4 py-4 ${ADMIN_TONES.info.surface}`}>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.courierExpense")}</p>
                    <p className={`mt-2 text-[1.1rem] font-semibold whitespace-nowrap ${ADMIN_TONES.info.text}`}>{formatMoney(thirtyDayCourier)}</p>
                  </div>
                  <div className={`rounded-[1rem] border px-4 py-4 ${ADMIN_TONES.expense.surface}`}>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.cards.orderExtras")}</p>
                    <p className={`mt-2 text-[1.1rem] font-semibold whitespace-nowrap ${ADMIN_TONES.expense.text}`}>{formatMoney(thirtyDayExtra)}</p>
                  </div>
                  <div className={`rounded-[1rem] border px-4 py-4 ${ADMIN_TONES.warning.surface}`}>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t(dict, "admin.reports.breakdown.missingCosts")}</p>
                    <p className={`mt-2 text-[1.1rem] font-semibold whitespace-nowrap ${thirtyDayMissingCostRules > 0 ? ADMIN_TONES.warning.text : ADMIN_TONES.neutral.text}`}>{thirtyDayMissingCostRules}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6">
              <div className="space-y-4">
                <div>
                  <h2 className="ui-overline">{t(dict, "admin.reports.monthlyTitle")}</h2>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-body)]">
                    {t(dict, "admin.reports.monthlyBody")}
                  </p>
                </div>
                {monthlyCards.length > 0 ? (
                  <div className="space-y-3">
                    {monthlyCards.map((row) => (
                      <div key={row.finance_month} className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-medium text-[color:var(--text-strong)]">{formatMonth(row.finance_month, locale)}</p>
                            <div className="text-right">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                                {t(dict, "admin.reports.monthly.cashResult")}
                              </p>
                              <p className={`mt-1 text-sm font-medium whitespace-nowrap ${ADMIN_TONES[getSignedMoneyTone(row.cash_result_amount)].text}`}>
                                {formatMoney(row.cash_result_amount)}
                              </p>
                            </div>
                          </div>
                          <div className="grid gap-2 text-sm leading-6 text-[color:var(--text-body)] sm:grid-cols-2">
                            <span>{t(dict, "admin.reports.monthly.orders")}: {row.order_count ?? 0}</span>
                            <span>{t(dict, "admin.reports.monthly.units")}: {row.units_sold ?? 0}</span>
                            <span className={`inline-flex whitespace-nowrap ${ADMIN_TONES.income.text}`}>{t(dict, "admin.reports.monthly.revenue")}: {formatMoney(row.gross_revenue_amount)}</span>
                            <span className={`inline-flex whitespace-nowrap ${ADMIN_TONES.expense.text}`}>{t(dict, "admin.reports.monthly.cogs")}: {formatMoney(row.known_cogs_amount)}</span>
                            <span className={`inline-flex whitespace-nowrap ${ADMIN_TONES.info.text}`}>{t(dict, "admin.reports.monthly.courier")}: {formatMoney(row.known_fulfillment_cost_amount)}</span>
                            <span className={`inline-flex whitespace-nowrap ${ADMIN_TONES.expense.text}`}>{t(dict, "admin.reports.monthly.orderExtras")}: {formatMoney(row.known_misc_cost_amount)}</span>
                            <span className={`inline-flex whitespace-nowrap ${ADMIN_TONES.warning.text}`}>{t(dict, "admin.reports.monthly.stockExpense")}: {formatMoney(row.stock_expense_amount)}</span>
                            <span className={`inline-flex whitespace-nowrap ${ADMIN_TONES.expense.text}`}>{t(dict, "admin.reports.monthly.operatingExpenses")}: {formatMoney(row.operating_expenses_amount)}</span>
                            <span className={`inline-flex whitespace-nowrap ${ADMIN_TONES[getSignedMoneyTone(row.known_order_profit_amount)].text}`}>{t(dict, "admin.reports.monthly.orderProfit")}: {formatMoney(row.known_order_profit_amount)}</span>
                            <span className={`inline-flex whitespace-nowrap ${ADMIN_TONES[getSignedMoneyTone(row.known_net_profit_amount)].text}`}>{t(dict, "admin.reports.monthly.net")}: {formatMoney(row.known_net_profit_amount)}</span>
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="ui-overline">{t(dict, "admin.reports.expenses.title")}</h2>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--text-body)]">
                      {t(dict, "admin.reports.expenses.body")}
                    </p>
                  </div>
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
                            <p className={`text-sm font-medium whitespace-nowrap ${ADMIN_TONES.expense.text}`}>{formatMoney(expense.amount)}</p>
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
        </div>
      </div>
    </main>
  );
}
