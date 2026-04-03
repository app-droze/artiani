import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import { normalizeAdminExpenseCategory, normalizeAdminExpenseCategoryKey } from "@/src/lib/adminExpenseCategory";
import { defaultLocale, isLocale, type Locale } from "@/src/i18n/locales";
import { getAdminSessionCookieName, verifyAdminSessionToken } from "@/src/lib/adminSession";
import { ADMIN_TONES, formatAdminMoney, getSignedMoneyTone } from "@/src/lib/adminUi";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";

type DatePreset = "7d" | "30d" | "90d" | "month" | "year" | "all" | "custom";

type ReportLineRow = {
  order_id: string;
  order_date: string;
  order_status: string;
  product_type: string | null;
  qty: number | null;
  line_revenue_amount: number | null;
  recognized_line_revenue_amount: number | null;
  recognized_line_cost_amount: number | null;
  recognized_allocated_delivery_cost_amount: number | null;
  recognized_allocated_misc_cost_amount: number | null;
  recognized_line_profit_amount: number | null;
  has_cost_rule: boolean;
  is_sale_recognized: boolean;
};

type BusinessExpenseRow = {
  id: string;
  incurred_on: string;
  expense_category: string;
  description: string;
  amount: number | null;
};

type InventoryPurchaseRow = {
  movement_date: string;
  value_delta: number | null;
  inventory_items:
    | {
        item_kind: string | null;
      }
    | Array<{
        item_kind: string | null;
      }>
    | null;
};

type OrderFinanceRow = {
  id: string;
  total_amount: number | null;
  shipping_amount: number | null;
  created_at: string;
};

type DeliveryCostRow = {
  order_id: string;
  amount: number | string | null;
};

type DateRange = {
  preset: DatePreset;
  from: string | null;
  to: string | null;
};

type MonthlyBucket = {
  month: string;
  recognizedRevenue: number;
  productExpense: number;
  courier: number;
  orderExtras: number;
  orderProfit: number;
  stockPurchases: number;
  operatingExpenses: number;
  cashResult: number;
};

const DATE_PRESET_OPTIONS: DatePreset[] = ["7d", "30d", "90d", "month", "year", "all"];
const PENDING_PAYMENT_STATUSES = ["pending", "awaiting_payment"] as const;
const PENDING_COURIER_STATUSES = ["paid", "processing"] as const;

const resolveAdminLocale = async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  return cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;
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

const toDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const subtractDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

const normalizeDateInput = (value: string | undefined) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : value;
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

const resolveDateRange = (params: {
  preset?: string;
  from?: string;
  to?: string;
}): DateRange => {
  const today = new Date();
  const todayValue = toDateValue(today);
  const fromParam = normalizeDateInput(params.from);
  const toParam = normalizeDateInput(params.to);

  if (fromParam && toParam) {
    return fromParam <= toParam
      ? { preset: "custom", from: fromParam, to: toParam }
      : { preset: "custom", from: toParam, to: fromParam };
  }

  const preset = DATE_PRESET_OPTIONS.includes(params.preset as DatePreset)
    ? (params.preset as DatePreset)
    : "30d";

  if (preset === "all") {
    return { preset, from: null, to: null };
  }

  if (preset === "month") {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return { preset, from: toDateValue(monthStart), to: todayValue };
  }

  if (preset === "year") {
    const yearStart = new Date(today.getFullYear(), 0, 1);
    return { preset, from: toDateValue(yearStart), to: todayValue };
  }

  const daysBack = preset === "7d" ? 6 : preset === "90d" ? 89 : 29;
  return {
    preset,
    from: toDateValue(subtractDays(today, daysBack)),
    to: todayValue,
  };
};

const buildPresetHref = (preset: DatePreset) => {
  const params = new URLSearchParams();
  params.set("preset", preset);
  return `/admin/reports?${params.toString()}`;
};

const unwrapRelation = <T,>(value: T | T[] | null): T | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
};

const buildProductTypeLabel = (
  productType: string | null,
  dict: Record<string, string>,
) => {
  if (!productType) {
    return t(dict, "admin.reports.unknownProductType");
  }

  return dict[`catalogue.types.${productType}`] ?? productType;
};

const buildInventoryKindLabel = (
  itemKind: string | null,
  dict: Record<string, string>,
) => {
  if (!itemKind) {
    return t(dict, "admin.reports.unknownInventoryKind");
  }

  return dict[`admin.inventory.kind.${itemKind}`] ?? itemKind;
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    preset?: string;
    from?: string;
    to?: string;
  }>;
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
  const supabase = getSupabaseAdmin();
  const dateRange = resolveDateRange(params);

  const linesQuery = supabase
    .from("reporting_order_line_item_profit_v1")
    .select(
      "order_id, order_date, order_status, product_type, qty, line_revenue_amount, recognized_line_revenue_amount, recognized_line_cost_amount, recognized_allocated_delivery_cost_amount, recognized_allocated_misc_cost_amount, recognized_line_profit_amount, has_cost_rule, is_sale_recognized",
    );
  const expensesQuery = supabase
    .from("business_expenses")
    .select("id, incurred_on, expense_category, description, amount")
    .order("incurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  const inventoryPurchasesQuery = supabase
    .from("inventory_movements")
    .select("movement_date, value_delta, inventory_items(item_kind)")
    .eq("movement_type", "purchase");
  const unpaidOrdersQuery = supabase
    .from("orders")
    .select("id, total_amount, shipping_amount, created_at")
    .in("status", [...PENDING_PAYMENT_STATUSES]);
  const pendingCourierOrdersQuery = supabase
    .from("orders")
    .select("id, total_amount, shipping_amount, created_at")
    .in("status", [...PENDING_COURIER_STATUSES]);

  if (dateRange.from) {
    linesQuery.gte("order_date", dateRange.from);
    expensesQuery.gte("incurred_on", dateRange.from);
    inventoryPurchasesQuery.gte("movement_date", dateRange.from);
    unpaidOrdersQuery.gte("created_at", `${dateRange.from}T00:00:00`);
    pendingCourierOrdersQuery.gte("created_at", `${dateRange.from}T00:00:00`);
  }

  if (dateRange.to) {
    linesQuery.lte("order_date", dateRange.to);
    expensesQuery.lte("incurred_on", dateRange.to);
    inventoryPurchasesQuery.lte("movement_date", dateRange.to);
    unpaidOrdersQuery.lte("created_at", `${dateRange.to}T23:59:59.999`);
    pendingCourierOrdersQuery.lte("created_at", `${dateRange.to}T23:59:59.999`);
  }

  const [
    { data: lineData, error: lineError },
    { data: expenseData, error: expenseError },
    { data: inventoryPurchaseData, error: inventoryPurchaseError },
    { data: unpaidOrdersData, error: unpaidOrdersError },
    { data: pendingCourierOrdersData, error: pendingCourierOrdersError },
  ] = await Promise.all([
    linesQuery,
    expensesQuery,
    inventoryPurchasesQuery,
    unpaidOrdersQuery,
    pendingCourierOrdersQuery,
  ]);

  if (lineError) {
    throw new Error(`[admin.reports] Failed to fetch reporting lines: ${lineError.message}`);
  }
  if (expenseError) {
    throw new Error(`[admin.reports] Failed to fetch business expenses: ${expenseError.message}`);
  }
  if (inventoryPurchaseError) {
    throw new Error(`[admin.reports] Failed to fetch inventory purchases: ${inventoryPurchaseError.message}`);
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

  const lineRows = (lineData ?? []) as ReportLineRow[];
  const expenseRows = (expenseData ?? []) as BusinessExpenseRow[];
  const inventoryPurchaseRows = (inventoryPurchaseData ?? []) as InventoryPurchaseRow[];
  const unpaidOrders = (unpaidOrdersData ?? []) as OrderFinanceRow[];
  const pendingCourierOrders = (pendingCourierOrdersData ?? []) as OrderFinanceRow[];
  const pendingCourierDeliveryCosts = (pendingCourierDeliveryCostsData ?? []) as DeliveryCostRow[];

  const recognizedRevenue = lineRows.reduce(
    (sum, row) => sum + (row.recognized_line_revenue_amount ?? 0),
    0,
  );
  const productExpense = lineRows.reduce(
    (sum, row) => sum + (row.recognized_line_cost_amount ?? 0),
    0,
  );
  const courierExpense = lineRows.reduce(
    (sum, row) => sum + (row.recognized_allocated_delivery_cost_amount ?? 0),
    0,
  );
  const orderExtras = lineRows.reduce(
    (sum, row) => sum + (row.recognized_allocated_misc_cost_amount ?? 0),
    0,
  );
  const orderProfit = lineRows.reduce(
    (sum, row) => sum + (row.recognized_line_profit_amount ?? 0),
    0,
  );
  const stockPurchases = inventoryPurchaseRows.reduce(
    (sum, row) => sum + (row.value_delta ?? 0),
    0,
  );
  const operatingExpenses = expenseRows.reduce(
    (sum, row) => sum + (row.amount ?? 0),
    0,
  );
  const cashResult = orderProfit - stockPurchases - operatingExpenses;

  const recognizedOrderCount = new Set(
    lineRows.filter((row) => row.is_sale_recognized).map((row) => row.order_id),
  ).size;
  const recognizedUnits = lineRows.reduce((sum, row) => (
    row.is_sale_recognized ? sum + (row.qty ?? 0) : sum
  ), 0);

  const unpaidOrderValue = unpaidOrders.reduce(
    (sum, row) => sum + (row.total_amount ?? 0),
    0,
  );
  const missingCostRuleCount = lineRows.filter(
    (row) => row.is_sale_recognized && !row.has_cost_rule,
  ).length;
  const reservedPaintingRows = lineRows.filter(
    (row) =>
      row.product_type === "painting" &&
      PENDING_PAYMENT_STATUSES.includes(row.order_status as (typeof PENDING_PAYMENT_STATUSES)[number]),
  );
  const reservedPaintingValue = reservedPaintingRows.reduce(
    (sum, row) => sum + (row.line_revenue_amount ?? 0),
    0,
  );
  const reservedPaintingCount = reservedPaintingRows.length;

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

  const monthlyBuckets = new Map<string, MonthlyBucket>();
  const ensureMonth = (month: string) => {
    const existing = monthlyBuckets.get(month);
    if (existing) {
      return existing;
    }

    const created: MonthlyBucket = {
      month,
      recognizedRevenue: 0,
      productExpense: 0,
      courier: 0,
      orderExtras: 0,
      orderProfit: 0,
      stockPurchases: 0,
      operatingExpenses: 0,
      cashResult: 0,
    };
    monthlyBuckets.set(month, created);
    return created;
  };

  for (const row of lineRows) {
    const monthKey = toMonthKey(row.order_date);
    const bucket = ensureMonth(monthKey);
    bucket.recognizedRevenue += row.recognized_line_revenue_amount ?? 0;
    bucket.productExpense += row.recognized_line_cost_amount ?? 0;
    bucket.courier += row.recognized_allocated_delivery_cost_amount ?? 0;
    bucket.orderExtras += row.recognized_allocated_misc_cost_amount ?? 0;
    bucket.orderProfit += row.recognized_line_profit_amount ?? 0;
  }

  for (const row of inventoryPurchaseRows) {
    const monthKey = toMonthKey(row.movement_date);
    const bucket = ensureMonth(monthKey);
    bucket.stockPurchases += row.value_delta ?? 0;
  }

  for (const row of expenseRows) {
    const monthKey = toMonthKey(row.incurred_on);
    const bucket = ensureMonth(monthKey);
    bucket.operatingExpenses += row.amount ?? 0;
  }

  const monthlyCards = Array.from(monthlyBuckets.values())
    .map((row) => ({
      ...row,
      cashResult: row.orderProfit - row.stockPurchases - row.operatingExpenses,
    }))
    .sort((left, right) => right.month.localeCompare(left.month));

  const salesBreakdown = Array.from(
    lineRows.reduce((map, row) => {
      if (!row.is_sale_recognized) {
        return map;
      }

      const key = row.product_type ?? "unknown";
      const current = map.get(key) ?? {
        productType: key,
        units: 0,
        revenue: 0,
        productExpense: 0,
        orderProfit: 0,
      };
      current.units += row.qty ?? 0;
      current.revenue += row.recognized_line_revenue_amount ?? 0;
      current.productExpense += row.recognized_line_cost_amount ?? 0;
      current.orderProfit += row.recognized_line_profit_amount ?? 0;
      map.set(key, current);
      return map;
    }, new Map<string, {
      productType: string;
      units: number;
      revenue: number;
      productExpense: number;
      orderProfit: number;
    }>()).values(),
  ).sort((left, right) => right.revenue - left.revenue);

  const stockBreakdown = Array.from(
    inventoryPurchaseRows.reduce((map, row) => {
      const relation = unwrapRelation(row.inventory_items);
      const key = relation?.item_kind ?? "unknown";
      const current = map.get(key) ?? { itemKind: key, amount: 0, entries: 0 };
      current.amount += row.value_delta ?? 0;
      current.entries += 1;
      map.set(key, current);
      return map;
    }, new Map<string, { itemKind: string; amount: number; entries: number }>())
      .values(),
  ).sort((left, right) => right.amount - left.amount);

  const expenseBreakdown = Array.from(
    expenseRows.reduce((map, row) => {
      const key = normalizeAdminExpenseCategoryKey(row.expense_category);
      const current = map.get(key) ?? { category: key, amount: 0, entries: 0 };
      current.amount += row.amount ?? 0;
      current.entries += 1;
      map.set(key, current);
      return map;
    }, new Map<string, { category: string; amount: number; entries: number }>())
      .values(),
  ).sort((left, right) => right.amount - left.amount);

  const activeRangeLabel =
    dateRange.from && dateRange.to
      ? `${formatDay(dateRange.from, locale)} - ${formatDay(dateRange.to, locale)}`
      : t(dict, "admin.reports.filters.allTime");

  const summaryCards = [
    {
      key: "recognizedRevenue",
      label: t(dict, "admin.reports.cards.recognizedRevenue"),
      value: formatAdminMoney(recognizedRevenue),
      tone: ADMIN_TONES.income,
      caption: `${recognizedOrderCount} ${t(dict, "admin.reports.meta.orders")} · ${recognizedUnits} ${t(dict, "admin.reports.meta.units")}`,
    },
    {
      key: "productExpense",
      label: t(dict, "admin.reports.cards.productExpense"),
      value: formatAdminMoney(productExpense),
      tone: ADMIN_TONES.expense,
    },
    {
      key: "courier",
      label: t(dict, "admin.reports.cards.courierExpense"),
      value: formatAdminMoney(courierExpense),
      tone: ADMIN_TONES.info,
    },
    {
      key: "orderExtras",
      label: t(dict, "admin.reports.cards.orderExtras"),
      value: formatAdminMoney(orderExtras),
      tone: ADMIN_TONES.expense,
    },
    {
      key: "orderProfit",
      label: t(dict, "admin.reports.cards.orderProfit"),
      value: formatAdminMoney(orderProfit),
      tone: ADMIN_TONES[getSignedMoneyTone(orderProfit)],
    },
    {
      key: "stockPurchases",
      label: t(dict, "admin.reports.cards.stockExpense"),
      value: formatAdminMoney(stockPurchases),
      tone: ADMIN_TONES.warning,
    },
    {
      key: "operatingExpenses",
      label: t(dict, "admin.reports.cards.operatingExpenses"),
      value: formatAdminMoney(operatingExpenses),
      tone: ADMIN_TONES.expense,
    },
    {
      key: "cashResult",
      label: t(dict, "admin.reports.cards.cashResult"),
      value: formatAdminMoney(cashResult),
      tone: ADMIN_TONES[getSignedMoneyTone(cashResult)],
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <Link href="/admin/dashboard" className="ui-button-secondary inline-flex w-fit items-center gap-2 whitespace-nowrap">
            <span aria-hidden="true">&larr;</span>
            <span>{t(dict, "admin.reports.backToDashboard")}</span>
          </Link>
          <p className="ui-overline">{t(dict, "admin.reports.kicker")}</p>
          <h1 className="font-display text-[2rem] leading-tight text-[color:var(--text-strong)]">
            {t(dict, "admin.reports.title")}
          </h1>
        </div>

        <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="ui-overline">{t(dict, "admin.reports.filters.title")}</h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-body)]">
                  {t(dict, "admin.reports.filters.activeRange")}: <span className="font-medium text-[color:var(--text-strong)]">{activeRangeLabel}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {DATE_PRESET_OPTIONS.map((preset) => {
                  const isActive = dateRange.preset === preset;
                  return (
                    <Link
                      key={preset}
                      href={buildPresetHref(preset)}
                      className={isActive ? "ui-button-primary whitespace-nowrap" : "ui-button-secondary whitespace-nowrap"}
                    >
                      {t(dict, `admin.reports.filters.presets.${preset}`)}
                    </Link>
                  );
                })}
              </div>
            </div>

            <form action="/admin/reports" method="get" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
              <input type="hidden" name="preset" value="custom" />
              <div className="space-y-1.5">
                <label htmlFor="reports-from" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                  {t(dict, "admin.reports.filters.from")}
                </label>
                <input
                  id="reports-from"
                  name="from"
                  type="date"
                  defaultValue={dateRange.from ?? ""}
                  className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="reports-to" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                  {t(dict, "admin.reports.filters.to")}
                </label>
                <input
                  id="reports-to"
                  name="to"
                  type="date"
                  defaultValue={dateRange.to ?? ""}
                  className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                />
              </div>
              <button type="submit" className="ui-button-secondary self-end whitespace-nowrap">
                {t(dict, "admin.reports.filters.apply")}
              </button>
              <Link href={buildPresetHref("30d")} className="ui-button-secondary self-end whitespace-nowrap">
                {t(dict, "admin.reports.filters.reset")}
              </Link>
            </form>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.key} className={`rounded-[1.1rem] border px-4 py-4 ${card.tone.surface}`}>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                {card.label}
              </p>
              <p className={`mt-2 whitespace-nowrap text-[1.15rem] font-semibold ${card.tone.text}`}>
                {card.value}
              </p>
              {card.caption ? (
                <p className="mt-1 text-sm leading-6 text-[color:var(--text-muted)]">{card.caption}</p>
              ) : null}
            </div>
          ))}
        </section>

        <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6">
          <div className="space-y-4">
            <div>
              <h2 className="ui-overline">{t(dict, "admin.reports.pending.title")}</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className={`rounded-[1rem] border px-4 py-4 ${ADMIN_TONES.warning.surface}`}>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                  {t(dict, "admin.reports.pending.unpaidOrders")}
                </p>
                <p className={`mt-2 whitespace-nowrap text-[1.05rem] font-semibold ${ADMIN_TONES.warning.text}`}>
                  {formatAdminMoney(unpaidOrderValue)}
                </p>
                <p className="mt-1 text-sm leading-6 text-[color:var(--text-muted)]">
                  {unpaidOrders.length} {t(dict, "admin.reports.pending.ordersCount")}
                </p>
              </div>
              <div className={`rounded-[1rem] border px-4 py-4 ${ADMIN_TONES.info.surface}`}>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                  {t(dict, "admin.reports.pending.courierTitle")}
                </p>
                <p className={`mt-2 whitespace-nowrap text-[1.05rem] font-semibold ${ADMIN_TONES.info.text}`}>
                  {formatAdminMoney(pendingCourierAmount)}
                </p>
                <p className="mt-1 text-sm leading-6 text-[color:var(--text-muted)]">
                  {pendingCourierOrders.length} {t(dict, "admin.reports.pending.ordersCount")}
                </p>
              </div>
              <div className={`rounded-[1rem] border px-4 py-4 ${ADMIN_TONES.warning.surface}`}>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                  {t(dict, "admin.reports.pending.missingCosts")}
                </p>
                <p className={`mt-2 whitespace-nowrap text-[1.05rem] font-semibold ${missingCostRuleCount > 0 ? ADMIN_TONES.warning.text : ADMIN_TONES.neutral.text}`}>
                  {missingCostRuleCount}
                </p>
                <p className="mt-1 text-sm leading-6 text-[color:var(--text-muted)]">
                  {t(dict, "admin.reports.pending.missingCostsBody")}
                </p>
              </div>
              <div className={`rounded-[1rem] border px-4 py-4 ${ADMIN_TONES.warning.surface}`}>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                  {t(dict, "admin.reports.pending.reservedPaintings")}
                </p>
                <p className={`mt-2 whitespace-nowrap text-[1.05rem] font-semibold ${ADMIN_TONES.warning.text}`}>
                  {formatAdminMoney(reservedPaintingValue)}
                </p>
                <p className="mt-1 text-sm leading-6 text-[color:var(--text-muted)]">
                  {reservedPaintingCount} {t(dict, "admin.reports.pending.itemsCount")}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6">
            <div className="space-y-4">
              <div>
                <h2 className="ui-overline">{t(dict, "admin.reports.monthlyTitle")}</h2>
              </div>
              {monthlyCards.length > 0 ? (
                <div className="space-y-3">
                  {monthlyCards.map((row) => (
                    <div key={row.month} className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium text-[color:var(--text-strong)]">{formatMonth(row.month, locale)}</p>
                          <p className={`text-sm font-medium whitespace-nowrap ${ADMIN_TONES[getSignedMoneyTone(row.cashResult)].text}`}>
                            {t(dict, "admin.reports.monthly.cashResult")}: {formatAdminMoney(row.cashResult)}
                          </p>
                        </div>
                        <div className="grid gap-2 text-sm leading-6 text-[color:var(--text-body)] sm:grid-cols-2">
                          <span className={`inline-flex whitespace-nowrap ${ADMIN_TONES.income.text}`}>{t(dict, "admin.reports.monthly.revenue")}: {formatAdminMoney(row.recognizedRevenue)}</span>
                          <span className={`inline-flex whitespace-nowrap ${ADMIN_TONES.expense.text}`}>{t(dict, "admin.reports.monthly.cogs")}: {formatAdminMoney(row.productExpense)}</span>
                          <span className={`inline-flex whitespace-nowrap ${ADMIN_TONES.info.text}`}>{t(dict, "admin.reports.monthly.courier")}: {formatAdminMoney(row.courier)}</span>
                          <span className={`inline-flex whitespace-nowrap ${ADMIN_TONES.expense.text}`}>{t(dict, "admin.reports.monthly.orderExtras")}: {formatAdminMoney(row.orderExtras)}</span>
                          <span className={`inline-flex whitespace-nowrap ${ADMIN_TONES[getSignedMoneyTone(row.orderProfit)].text}`}>{t(dict, "admin.reports.monthly.orderProfit")}: {formatAdminMoney(row.orderProfit)}</span>
                          <span className={`inline-flex whitespace-nowrap ${ADMIN_TONES.warning.text}`}>{t(dict, "admin.reports.monthly.stockExpense")}: {formatAdminMoney(row.stockPurchases)}</span>
                          <span className={`inline-flex whitespace-nowrap ${ADMIN_TONES.expense.text}`}>{t(dict, "admin.reports.monthly.operatingExpenses")}: {formatAdminMoney(row.operatingExpenses)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.reports.monthlyEmpty")}</p>
              )}
            </div>
          </section>

          <div className="space-y-6">
            <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6">
              <div className="space-y-4">
                <div>
                  <h2 className="ui-overline">{t(dict, "admin.reports.salesBreakdown.title")}</h2>
                </div>
                {salesBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {salesBreakdown.map((row) => (
                      <div key={row.productType} className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-medium text-[color:var(--text-strong)]">
                              {buildProductTypeLabel(row.productType === "unknown" ? null : row.productType, dict)}
                            </p>
                            <p className={`text-sm font-medium whitespace-nowrap ${ADMIN_TONES.income.text}`}>
                              {formatAdminMoney(row.revenue)}
                            </p>
                          </div>
                          <div className="grid gap-2 text-sm leading-6 text-[color:var(--text-body)] sm:grid-cols-2">
                            <span>{t(dict, "admin.reports.meta.units")}: {row.units}</span>
                            <span className={`inline-flex whitespace-nowrap ${ADMIN_TONES.expense.text}`}>{t(dict, "admin.reports.cards.productExpense")}: {formatAdminMoney(row.productExpense)}</span>
                            <span className={`inline-flex whitespace-nowrap ${ADMIN_TONES[getSignedMoneyTone(row.orderProfit)].text}`}>{t(dict, "admin.reports.cards.orderProfit")}: {formatAdminMoney(row.orderProfit)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.reports.salesBreakdown.empty")}</p>
                )}
              </div>
            </section>

            <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6">
              <div className="space-y-4">
                <div>
                  <h2 className="ui-overline">{t(dict, "admin.reports.stockBreakdown.title")}</h2>
                </div>
                {stockBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {stockBreakdown.map((row) => (
                      <div key={row.itemKind} className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-[color:var(--text-strong)]">
                              {buildInventoryKindLabel(row.itemKind === "unknown" ? null : row.itemKind, dict)}
                            </p>
                            <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                              {row.entries} {t(dict, "admin.reports.meta.entries")}
                            </p>
                          </div>
                          <p className={`text-sm font-medium whitespace-nowrap ${ADMIN_TONES.warning.text}`}>
                            {formatAdminMoney(row.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.reports.stockBreakdown.empty")}</p>
                )}
              </div>
            </section>

            <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6">
              <div className="space-y-4">
                <div>
                  <h2 className="ui-overline">{t(dict, "admin.reports.expenseBreakdown.title")}</h2>
                </div>
                {expenseBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {expenseBreakdown.map((row) => (
                      <div key={row.category} className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-[color:var(--text-strong)]">
                              {normalizeAdminExpenseCategory(row.category, locale, dict)}
                            </p>
                            <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                              {row.entries} {t(dict, "admin.reports.meta.entries")}
                            </p>
                          </div>
                          <p className={`text-sm font-medium whitespace-nowrap ${ADMIN_TONES.expense.text}`}>
                            {formatAdminMoney(row.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.reports.expenseBreakdown.empty")}</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
