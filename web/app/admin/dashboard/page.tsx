import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import { defaultLocale, isLocale, type Locale } from "@/src/i18n/locales";
import { getAdminSessionCookieName, verifyAdminSessionToken } from "@/src/lib/adminSession";
import { ADMIN_TONES, getAdminStatusTone, getSignedMoneyTone } from "@/src/lib/adminUi";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";

type DashboardRecentOrderRow = {
  id: string;
  order_code: string;
  customer_name: string;
  status: string;
  total_amount: number | null;
  delivery_area: string | null;
  created_at: string;
};

type DashboardRecentOrderItemRow = {
  order_id: string;
  qty: number;
  snapshot_product_type: string | null;
  snapshot_title: string | null;
  snapshot_title_en: string | null;
  snapshot_title_ka: string | null;
};

type DashboardFinanceRow = {
  gross_revenue_amount: number | null;
  known_cogs_amount: number | null;
  known_fulfillment_cost_amount: number | null;
  known_misc_cost_amount: number | null;
  known_order_profit_amount: number | null;
  operating_expenses_amount: number | null;
};

type DashboardNonPaintingRevenueRow = {
  recognized_line_revenue_amount: number | null;
};

type DashboardNonPaintingProfitRow = {
  line_profit_amount: number | null;
};

type DashboardInventorySummaryRow = {
  stock_on_hand_value_amount: number | null;
};

type DashboardInventoryPositionRow = {
  inventory_item_id: string;
  product_id: string | null;
  item_kind: string;
  size_label: string | null;
  qty_on_hand: number | null;
};

type DashboardProductPriceRow = {
  id: string;
  product_variants: Array<{
    size_label: string | null;
    price: number | null;
  }> | null;
};

type DashboardRecentOrderRowWithDeadline = DashboardRecentOrderRow & {
  delivery_deadline: Date;
  is_active_pipeline: boolean;
  days_left: number;
};

const DELIVERY_WORKING_DAYS = {
  tbilisi: 4,
  region: 6,
} as const;

const resolveAdminLocale = async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  return cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;
};

const formatMoney = (value: number | null | undefined) => `${value ?? 0} ₾`;

const formatAdminDate = (value: string, locale: Locale) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "ka" ? "ka-GE" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatAdminDay = (value: string | Date, locale: Locale) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : "";
  }

  return new Intl.DateTimeFormat(locale === "ka" ? "ka-GE" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
};

const addWorkingDays = (value: string, workingDays: number) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date(value);
  }

  const result = new Date(date);
  let remaining = workingDays;

  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }

  return result;
};

const getDeliveryWorkingDays = (deliveryArea: string | null) =>
  deliveryArea === "tbilisi" ? DELIVERY_WORKING_DAYS.tbilisi : DELIVERY_WORKING_DAYS.region;

const isActivePipelineStatus = (status: string) => status !== "completed" && status !== "cancelled";
const isDeliveryQueueStatus = (status: string) => status === "processing" || status === "shipped";
const isPaidQueueStatus = (status: string) => status === "paid";
const isUnpaidQueueStatus = (status: string) => status === "awaiting_payment" || status === "pending";

const getDaysLeft = (deadline: Date) => {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const deadlineStart = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  return Math.round((deadlineStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
};

const getDashboardDeadlineTone = (daysLeft: number, status: string) => {
  if (!isActivePipelineStatus(status)) {
    return ADMIN_TONES.neutral;
  }

  if (daysLeft <= 1) {
    return ADMIN_TONES.expense;
  }

  if (daysLeft <= 2) {
    return ADMIN_TONES.warning;
  }

  return ADMIN_TONES.neutral;
};

const getDaysLeftLabel = (daysLeft: number, locale: Locale, dict: Record<string, string>) => {
  if (daysLeft < 0) {
    return t(dict, "admin.dashboard.recent.deadline.overdue");
  }

  if (daysLeft === 0) {
    return t(dict, "admin.dashboard.recent.deadline.today");
  }

  if (locale === "ka") {
    return daysLeft === 1
      ? t(dict, "admin.dashboard.recent.deadline.oneDayLeft")
      : `${daysLeft} ${t(dict, "admin.dashboard.recent.deadline.daysLeftSuffixKa")}`;
  }

  return daysLeft === 1
    ? t(dict, "admin.dashboard.recent.deadline.oneDayLeft")
    : `${daysLeft} ${t(dict, "admin.dashboard.recent.deadline.daysLeftSuffixEn")}`;
};

const buildProductTitle = ({
  productType,
  name,
  dict,
}: {
  productType: string | null;
  name: string;
  dict: Record<string, string>;
}) => {
  const typeLabel = productType ? (dict[`catalogue.types.${productType}`] ?? productType) : null;
  return typeLabel ? `${typeLabel} - ${name}` : name;
};

const pickItemTitle = (
  item: DashboardRecentOrderItemRow,
  locale: Locale,
  dict: Record<string, string>,
) => {
  const name =
    locale === "ka"
      ? item.snapshot_title_ka ?? item.snapshot_title_en ?? item.snapshot_title ?? "—"
      : item.snapshot_title_en ?? item.snapshot_title_ka ?? item.snapshot_title ?? "—";
  return buildProductTitle({ productType: item.snapshot_product_type, name, dict });
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
  const supabase = getSupabaseAdmin();

  const [
    financeRowsResult,
    nonPaintingRevenueResult,
    nonPaintingProfitResult,
    recentOrdersResult,
    inventorySummaryResult,
    inventoryPositionsResult,
    productPricesResult,
  ] = await Promise.all([
    supabase
      .from("reporting_monthly_finance_v1")
      .select("gross_revenue_amount, known_cogs_amount, known_fulfillment_cost_amount, known_misc_cost_amount, known_order_profit_amount, operating_expenses_amount")
      .order("finance_month", { ascending: false }),
    supabase
      .from("reporting_order_line_item_profit_v1")
      .select("recognized_line_revenue_amount")
      .neq("product_type", "painting")
      .in("order_status", ["paid", "processing", "shipped", "completed"]),
    supabase
      .from("reporting_order_line_item_profit_v1")
      .select("line_profit_amount")
      .neq("product_type", "painting")
      .in("order_status", ["paid", "processing", "shipped", "completed"]),
    supabase
      .from("orders")
      .select("id, order_code, customer_name, status, total_amount, delivery_area, created_at"),
    supabase
      .from("reporting_inventory_summary_v1")
      .select("stock_on_hand_value_amount")
      .maybeSingle(),
    supabase
      .from("reporting_inventory_position_v1")
      .select("inventory_item_id, product_id, item_kind, size_label, qty_on_hand"),
    supabase
      .from("products")
      .select("id, product_variants(size_label, price)")
      .eq("is_active", true),
  ]);

  if (financeRowsResult.error) {
    throw new Error(`[admin.dashboard] Failed to fetch all-time finance rows: ${financeRowsResult.error.message}`);
  }
  if (nonPaintingRevenueResult.error) {
    throw new Error(`[admin.dashboard] Failed to fetch non-painting revenue: ${nonPaintingRevenueResult.error.message}`);
  }
  if (nonPaintingProfitResult.error) {
    throw new Error(`[admin.dashboard] Failed to fetch non-painting profit: ${nonPaintingProfitResult.error.message}`);
  }
  if (recentOrdersResult.error) {
    throw new Error(`[admin.dashboard] Failed to fetch recent orders: ${recentOrdersResult.error.message}`);
  }
  if (inventorySummaryResult.error) {
    throw new Error(`[admin.dashboard] Failed to fetch inventory summary: ${inventorySummaryResult.error.message}`);
  }
  if (inventoryPositionsResult.error) {
    throw new Error(`[admin.dashboard] Failed to fetch inventory positions: ${inventoryPositionsResult.error.message}`);
  }
  if (productPricesResult.error) {
    throw new Error(`[admin.dashboard] Failed to fetch product prices: ${productPricesResult.error.message}`);
  }

  const financeRows = (financeRowsResult.data ?? []) as DashboardFinanceRow[];
  const nonPaintingRevenueRows = (nonPaintingRevenueResult.data ?? []) as DashboardNonPaintingRevenueRow[];
  const nonPaintingProfitRows = (nonPaintingProfitResult.data ?? []) as DashboardNonPaintingProfitRow[];
  const inventorySummary = (inventorySummaryResult.data ?? {
    stock_on_hand_value_amount: 0,
  }) as DashboardInventorySummaryRow;
  const inventoryPositions = (inventoryPositionsResult.data ?? []) as DashboardInventoryPositionRow[];
  const productPrices = (productPricesResult.data ?? []) as DashboardProductPriceRow[];
  const dashboardOrders = ((recentOrdersResult.data ?? []) as DashboardRecentOrderRow[])
    .map((order) => {
      const deliveryDeadline = addWorkingDays(order.created_at, getDeliveryWorkingDays(order.delivery_area));
      return {
        ...order,
        delivery_deadline: deliveryDeadline,
        is_active_pipeline: isActivePipelineStatus(order.status),
        days_left: getDaysLeft(deliveryDeadline),
      };
    })
    .sort((left, right) => {
      if (left.is_active_pipeline !== right.is_active_pipeline) {
        return left.is_active_pipeline ? -1 : 1;
      }

      const deliveryDiff = left.delivery_deadline.getTime() - right.delivery_deadline.getTime();
      if (deliveryDiff !== 0) {
        return deliveryDiff;
      }

      return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
    }) as DashboardRecentOrderRowWithDeadline[];
  const deliveryOrders = dashboardOrders.filter((order) => isDeliveryQueueStatus(order.status)).slice(0, 6);
  const paidOrders = dashboardOrders.filter((order) => isPaidQueueStatus(order.status)).slice(0, 6);
  const unpaidOrders = dashboardOrders.filter((order) => isUnpaidQueueStatus(order.status)).slice(0, 6);
  const dashboardOrderIds = [...deliveryOrders, ...paidOrders, ...unpaidOrders].map((order) => order.id);
  const recentOrderItemsResult = dashboardOrderIds.length
    ? await supabase
        .from("order_items")
        .select("order_id, qty, snapshot_product_type, snapshot_title, snapshot_title_en, snapshot_title_ka")
        .in("order_id", dashboardOrderIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (recentOrderItemsResult.error) {
    throw new Error(`[admin.dashboard] Failed to fetch recent order items: ${recentOrderItemsResult.error.message}`);
  }

  const recentOrderItems = (recentOrderItemsResult.data ?? []) as DashboardRecentOrderItemRow[];
  const recentOrderItemsByOrderId = new Map<string, DashboardRecentOrderItemRow[]>();

  for (const item of recentOrderItems) {
    const existing = recentOrderItemsByOrderId.get(item.order_id);
    if (existing) {
      existing.push(item);
    } else {
      recentOrderItemsByOrderId.set(item.order_id, [item]);
    }
  }

  const totalRevenue = financeRows.reduce((sum, row) => sum + (row.gross_revenue_amount ?? 0), 0);
  const totalRevenueWithoutPaintings = nonPaintingRevenueRows.reduce(
    (sum, row) => sum + (row.recognized_line_revenue_amount ?? 0),
    0,
  );
  const totalOrderProfit = financeRows.reduce((sum, row) => sum + (row.known_order_profit_amount ?? 0), 0);
  const totalOrderProfitWithoutPaintings = nonPaintingProfitRows.reduce(
    (sum, row) => sum + (row.line_profit_amount ?? 0),
    0,
  );
  const totalExpenses = financeRows.reduce(
    (sum, row) =>
      sum +
      (row.known_cogs_amount ?? 0) +
      (row.known_fulfillment_cost_amount ?? 0) +
      (row.known_misc_cost_amount ?? 0) +
      (row.operating_expenses_amount ?? 0),
    0,
  );
  const trackedBalance = totalRevenue - totalExpenses;
  const stockOnHandValue = inventorySummary.stock_on_hand_value_amount ?? 0;
  const sellPriceLookup = new Map<string, number>();

  for (const product of productPrices) {
    for (const variant of product.product_variants ?? []) {
      if (typeof variant.price !== "number") {
        continue;
      }

      const sizeKey = (variant.size_label ?? "").trim().toLowerCase();
      sellPriceLookup.set(`${product.id}::${sizeKey}`, variant.price);
    }
  }

  const stockSellValue = inventoryPositions.reduce((sum, item) => {
    if (!item.product_id || item.item_kind !== "sellable") {
      return sum;
    }

    const sizeKey = (item.size_label ?? "").trim().toLowerCase();
    const sellPrice = sellPriceLookup.get(`${item.product_id}::${sizeKey}`);
    if (typeof sellPrice !== "number") {
      return sum;
    }

    return sum + ((item.qty_on_hand ?? 0) * sellPrice);
  }, 0);
  const estimatedBankCash = trackedBalance - stockOnHandValue;
  const estimatedBankCashTone = ADMIN_TONES[getSignedMoneyTone(estimatedBankCash)];
  const totalOrderProfitTone = ADMIN_TONES[getSignedMoneyTone(totalOrderProfit)];
  const renderOrderCard = (order: DashboardRecentOrderRowWithDeadline) => {
    const orderItems = recentOrderItemsByOrderId.get(order.id) ?? [];
    const statusTone = ADMIN_TONES[getAdminStatusTone(order.status)];
    const deadlineTone = getDashboardDeadlineTone(order.days_left, order.status);

    return (
      <Link
        key={order.id}
        href={`/admin/orders/${encodeURIComponent(order.order_code)}?returnTo=${encodeURIComponent("/admin/dashboard")}`}
        className="flex flex-col gap-2.5 rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4 transition-colors hover:border-black/15"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 font-medium text-[color:var(--text-strong)]">{order.order_code}</p>
          <p className={`whitespace-nowrap text-sm font-medium ${ADMIN_TONES.income.text}`}>
            {formatMoney(order.total_amount)}
          </p>
        </div>
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-sm leading-5 text-[color:var(--text-body)]">{order.customer_name}</p>
          <p className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${statusTone.surface} ${statusTone.text}`}>
            {t(dict, `admin.orders.status.${order.status}`)}
          </p>
        </div>
        {orderItems.length > 0 ? (
          <div className="space-y-0.5 text-xs leading-4 text-[color:var(--text-muted)]">
            {orderItems.map((item, index) => (
              <p key={`${order.id}-${index}`}>
                {item.qty}× {pickItemTitle(item, locale, dict)}
              </p>
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] leading-4 text-[color:var(--text-muted)]">
            {formatAdminDate(order.created_at, locale)}
          </p>
          <p className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${deadlineTone.surface} ${deadlineTone.text}`}>
            {formatAdminDay(order.delivery_deadline, locale)}: {getDaysLeftLabel(order.days_left, locale, dict)}
          </p>
        </div>
      </Link>
    );
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <section className="ui-card border border-[var(--border-soft)] px-6 py-7 sm:px-7 sm:py-8">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/orders" className="ui-button-secondary whitespace-nowrap">
                {t(dict, "admin.dashboard.ordersLink")}
              </Link>
              <Link href="/admin/reports" className="ui-button-secondary whitespace-nowrap">
                {t(dict, "admin.dashboard.reportsLink")}
              </Link>
              <Link href="/admin/inventory" className="ui-button-secondary whitespace-nowrap">
                {t(dict, "admin.dashboard.inventoryLink")}
              </Link>
              <Link href="/admin/expenses" className="ui-button-secondary whitespace-nowrap">
                {t(dict, "admin.dashboard.expensesLink")}
              </Link>
              <form action="/api/admin/logout" method="post">
                <button type="submit" className="ui-button-secondary whitespace-nowrap">
                  {t(dict, "admin.dashboard.logout")}
                </button>
              </form>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className={`rounded-[0.95rem] border px-3.5 py-3 ${ADMIN_TONES.income.surface}`}>
                <p className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                  {t(dict, "admin.dashboard.finance.revenue")}
                </p>
                <p className={`mt-1.5 text-[1.05rem] font-semibold ${ADMIN_TONES.income.text}`}>
                  {formatMoney(totalRevenue)} ({formatMoney(totalRevenueWithoutPaintings)})
                </p>
              </div>
              <div className={`rounded-[0.95rem] border px-3.5 py-3 ${totalOrderProfitTone.surface}`}>
                <p className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                  {t(dict, "admin.dashboard.finance.orderProfit")}
                </p>
                <p className={`mt-1.5 text-[1.05rem] font-semibold ${totalOrderProfitTone.text}`}>
                  {formatMoney(totalOrderProfit)} ({formatMoney(totalOrderProfitWithoutPaintings)})
                </p>
              </div>
              <div className={`rounded-[0.95rem] border px-3.5 py-3 ${ADMIN_TONES.expense.surface}`}>
                <p className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                  {t(dict, "admin.dashboard.finance.expenses")}
                </p>
                <p className={`mt-1.5 text-[1.05rem] font-semibold ${ADMIN_TONES.expense.text}`}>
                  {formatMoney(totalExpenses)}
                </p>
              </div>
              <div className={`rounded-[0.95rem] border px-3.5 py-3 ${ADMIN_TONES.warning.surface}`}>
                <p className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                  {t(dict, "admin.dashboard.finance.stockOnHand")}
                </p>
                <p className={`mt-1.5 text-[1.05rem] font-semibold ${ADMIN_TONES.warning.text}`}>
                  {formatMoney(stockOnHandValue)} ({formatMoney(stockSellValue)})
                </p>
              </div>
              <div className={`rounded-[0.95rem] border px-3.5 py-3 ${estimatedBankCashTone.surface}`}>
                <p className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                  {t(dict, "admin.dashboard.finance.estimatedBankCash")}
                </p>
                <p className={`mt-1.5 text-[1.05rem] font-semibold ${estimatedBankCashTone.text}`}>
                  {formatMoney(estimatedBankCash)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6">
          <div className="space-y-5">
            <div className="grid gap-6 xl:grid-cols-3">
              <div className="space-y-3">
                <p className="ui-overline">{t(dict, "admin.dashboard.queue.deliveryTitle")}</p>
                {deliveryOrders.length > 0 ? (
                  <div className="space-y-3">{deliveryOrders.map(renderOrderCard)}</div>
                ) : (
                  <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                    {t(dict, "admin.dashboard.queue.deliveryEmpty")}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <p className="ui-overline">{t(dict, "admin.dashboard.queue.paidTitle")}</p>
                {paidOrders.length > 0 ? (
                  <div className="space-y-3">{paidOrders.map(renderOrderCard)}</div>
                ) : (
                  <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                    {t(dict, "admin.dashboard.queue.paidEmpty")}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <p className="ui-overline">{t(dict, "admin.dashboard.queue.unpaidTitle")}</p>
                {unpaidOrders.length > 0 ? (
                  <div className="space-y-3">{unpaidOrders.map(renderOrderCard)}</div>
                ) : (
                  <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                    {t(dict, "admin.dashboard.queue.unpaidEmpty")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
