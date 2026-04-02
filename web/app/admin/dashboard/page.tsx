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
  operating_expenses_amount: number | null;
};

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
    awaitingPaymentResult,
    processingOrdersResult,
    shippedOrdersResult,
    financeRowsResult,
    recentOrdersResult,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["awaiting_payment", "paid", "pending"]),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "processing"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "shipped"),
    supabase
      .from("reporting_monthly_finance_v1")
      .select("gross_revenue_amount, known_cogs_amount, known_fulfillment_cost_amount, known_misc_cost_amount, operating_expenses_amount")
      .order("finance_month", { ascending: false }),
    supabase
      .from("orders")
      .select("id, order_code, customer_name, status, total_amount, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  if (awaitingPaymentResult.error) {
    throw new Error(`[admin.dashboard] Failed to count awaiting payment orders: ${awaitingPaymentResult.error.message}`);
  }
  if (processingOrdersResult.error) {
    throw new Error(`[admin.dashboard] Failed to count processing orders: ${processingOrdersResult.error.message}`);
  }
  if (shippedOrdersResult.error) {
    throw new Error(`[admin.dashboard] Failed to count shipped orders: ${shippedOrdersResult.error.message}`);
  }
  if (financeRowsResult.error) {
    throw new Error(`[admin.dashboard] Failed to fetch all-time finance rows: ${financeRowsResult.error.message}`);
  }
  if (recentOrdersResult.error) {
    throw new Error(`[admin.dashboard] Failed to fetch recent orders: ${recentOrdersResult.error.message}`);
  }

  const awaitingPaymentOrders = awaitingPaymentResult.count ?? 0;
  const processingOrders = processingOrdersResult.count ?? 0;
  const shippedOrders = shippedOrdersResult.count ?? 0;
  const financeRows = (financeRowsResult.data ?? []) as DashboardFinanceRow[];
  const recentOrders = (recentOrdersResult.data ?? []) as DashboardRecentOrderRow[];
  const recentOrderIds = recentOrders.map((order) => order.id);
  const recentOrderItemsResult = recentOrderIds.length
    ? await supabase
        .from("order_items")
        .select("order_id, qty, snapshot_product_type, snapshot_title, snapshot_title_en, snapshot_title_ka")
        .in("order_id", recentOrderIds)
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
  const balanceTone = ADMIN_TONES[getSignedMoneyTone(trackedBalance)];

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <section className="ui-card border border-[var(--border-soft)] px-6 py-7 sm:px-7 sm:py-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="font-display text-[2rem] leading-tight text-[color:var(--text-strong)] sm:text-[2.35rem]">
                  {t(dict, "admin.dashboard.title")}
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-[color:var(--text-body)]">
                  {t(dict, "admin.dashboard.body")}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/admin/orders" className="ui-button-secondary whitespace-nowrap">
                  {t(dict, "admin.dashboard.ordersLink")}
                </Link>
                <Link href="/admin/fulfillment" className="ui-button-secondary whitespace-nowrap">
                  {t(dict, "admin.dashboard.fulfillmentLink")}
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

            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className={`rounded-[0.95rem] border px-3.5 py-3 ${ADMIN_TONES.income.surface}`}>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    {t(dict, "admin.dashboard.finance.revenue")}
                  </p>
                  <p className={`mt-1.5 text-[1.05rem] font-semibold ${ADMIN_TONES.income.text}`}>
                    {formatMoney(totalRevenue)}
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
                <div className={`rounded-[0.95rem] border px-3.5 py-3 ${balanceTone.surface}`}>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    {t(dict, "admin.dashboard.finance.balance")}
                  </p>
                  <p className={`mt-1.5 text-[1.05rem] font-semibold ${balanceTone.text}`}>
                    {formatMoney(trackedBalance)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="ui-overline">{t(dict, "admin.dashboard.recent.title")}</p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-body)]">
                  {t(dict, "admin.dashboard.recent.body")}
                </p>
              </div>
              <Link href="/admin/orders" className="ui-button-secondary whitespace-nowrap">
                {t(dict, "admin.dashboard.recent.viewAll")}
              </Link>
            </div>

            {recentOrders.length > 0 ? (
              <div className="mt-5 space-y-3">
                {recentOrders.map((order) => (
                  (() => {
                    const orderItems = recentOrderItemsByOrderId.get(order.id) ?? [];
                    const statusTone = ADMIN_TONES[getAdminStatusTone(order.status)];

                    return (
                      <Link
                        key={order.id}
                        href={`/admin/orders/${encodeURIComponent(order.order_code)}?returnTo=${encodeURIComponent("/admin/dashboard")}`}
                        className="flex flex-col gap-3 rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4 transition-colors hover:border-black/15 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="space-y-1.5">
                          <p className="font-medium text-[color:var(--text-strong)]">{order.order_code}</p>
                          <p className="text-sm leading-6 text-[color:var(--text-body)]">{order.customer_name}</p>
                          {orderItems.length > 0 ? (
                            <div className="space-y-0.5 text-xs leading-5 text-[color:var(--text-muted)]">
                              {orderItems.map((item, index) => (
                                <p key={`${order.id}-${index}`}>
                                  {item.qty}× {pickItemTitle(item, locale, dict)}
                                </p>
                              ))}
                            </div>
                          ) : null}
                          <p className="text-xs leading-5 text-[color:var(--text-muted)]">
                            {formatAdminDate(order.created_at, locale)}
                          </p>
                        </div>
                        <div className="space-y-1 text-left sm:text-right">
                          <p className={`text-sm font-medium ${ADMIN_TONES.income.text}`}>
                            {formatMoney(order.total_amount)}
                          </p>
                          <p className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${statusTone.surface} ${statusTone.text}`}>
                            {t(dict, `admin.orders.status.${order.status}`)}
                          </p>
                        </div>
                      </Link>
                    );
                  })()
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-[color:var(--text-muted)]">
                {t(dict, "admin.dashboard.recent.empty")}
              </p>
            )}
          </div>

          <div className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6">
            <div className="space-y-4">
              <div>
                <p className="ui-overline">{t(dict, "admin.dashboard.statusBoard.title")}</p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-body)]">
                  {t(dict, "admin.dashboard.statusBoard.body")}
                </p>
              </div>
              <div className="space-y-3">
                <div className={`rounded-[1rem] border px-4 py-4 ${ADMIN_TONES.warning.surface}`}>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    {t(dict, "admin.orders.status.awaiting_payment")}
                  </p>
                  <p className={`mt-2 text-[1.25rem] font-semibold ${ADMIN_TONES.warning.text}`}>
                    {awaitingPaymentOrders}
                  </p>
                </div>
                <div className={`rounded-[1rem] border px-4 py-4 ${ADMIN_TONES.info.surface}`}>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    {t(dict, "admin.orders.status.processing")}
                  </p>
                  <p className={`mt-2 text-[1.25rem] font-semibold ${ADMIN_TONES.info.text}`}>
                    {processingOrders}
                  </p>
                </div>
                <div className={`rounded-[1rem] border px-4 py-4 ${ADMIN_TONES.income.surface}`}>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    {t(dict, "admin.orders.status.shipped")}
                  </p>
                  <p className={`mt-2 text-[1.25rem] font-semibold ${ADMIN_TONES.income.text}`}>
                    {shippedOrders}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
