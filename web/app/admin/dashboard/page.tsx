import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import { defaultLocale, isLocale, type Locale } from "@/src/i18n/locales";
import { getAdminSessionCookieName, verifyAdminSessionToken } from "@/src/lib/adminSession";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";

type DashboardRecentOrderRow = {
  id: string;
  order_code: string;
  customer_name: string;
  status: string;
  total_amount: number | null;
  created_at: string;
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
  if (recentOrdersResult.error) {
    throw new Error(`[admin.dashboard] Failed to fetch recent orders: ${recentOrdersResult.error.message}`);
  }

  const awaitingPaymentOrders = awaitingPaymentResult.count ?? 0;
  const processingOrders = processingOrdersResult.count ?? 0;
  const shippedOrders = shippedOrdersResult.count ?? 0;
  const recentOrders = (recentOrdersResult.data ?? []) as DashboardRecentOrderRow[];

  const quickLinks = [
    {
      href: "/admin/orders",
      title: t(dict, "admin.dashboard.quick.orders.title"),
      body: t(dict, "admin.dashboard.quick.orders.body"),
      action: t(dict, "admin.dashboard.quick.orders.action"),
    },
    {
      href: "/admin/fulfillment",
      title: t(dict, "admin.dashboard.quick.fulfillment.title"),
      body: t(dict, "admin.dashboard.quick.fulfillment.body"),
      action: t(dict, "admin.dashboard.quick.fulfillment.action"),
    },
    {
      href: "/admin/reports",
      title: t(dict, "admin.dashboard.quick.reports.title"),
      body: t(dict, "admin.dashboard.quick.reports.body"),
      action: t(dict, "admin.dashboard.quick.reports.action"),
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <section className="ui-card border border-[var(--border-soft)] px-6 py-7 sm:px-7 sm:py-8">
          <div className="space-y-5">
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
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="ui-card border border-[var(--border-soft)] px-5 py-5 transition-colors hover:border-black/15"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-[1.1rem] font-semibold text-[color:var(--text-strong)]">{item.title}</h2>
                  <p className="text-sm leading-6 text-[color:var(--text-body)]">{item.body}</p>
                </div>
                <span className="ui-overline">{item.action}</span>
              </div>
            </Link>
          ))}
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
                  <Link
                    key={order.id}
                    href={`/admin/orders/${encodeURIComponent(order.order_code)}`}
                    className="flex flex-col gap-3 rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4 transition-colors hover:border-black/15 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-[color:var(--text-strong)]">{order.order_code}</p>
                      <p className="text-sm leading-6 text-[color:var(--text-body)]">{order.customer_name}</p>
                      <p className="text-xs leading-5 text-[color:var(--text-muted)]">
                        {formatAdminDate(order.created_at, locale)}
                      </p>
                    </div>
                    <div className="space-y-1 text-left sm:text-right">
                      <p className="text-sm font-medium text-[color:var(--text-strong)]">
                        {formatMoney(order.total_amount)}
                      </p>
                      <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                        {t(dict, `admin.orders.status.${order.status}`)}
                      </p>
                    </div>
                  </Link>
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
                <div className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    {t(dict, "admin.orders.status.awaiting_payment")}
                  </p>
                  <p className="mt-2 text-[1.25rem] font-semibold text-[color:var(--text-strong)]">
                    {awaitingPaymentOrders}
                  </p>
                </div>
                <div className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    {t(dict, "admin.orders.status.processing")}
                  </p>
                  <p className="mt-2 text-[1.25rem] font-semibold text-[color:var(--text-strong)]">
                    {processingOrders}
                  </p>
                </div>
                <div className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    {t(dict, "admin.orders.status.shipped")}
                  </p>
                  <p className="mt-2 text-[1.25rem] font-semibold text-[color:var(--text-strong)]">
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
