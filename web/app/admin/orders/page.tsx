import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import { defaultLocale, isLocale, type Locale } from "@/src/i18n/locales";
import { getAdminSessionCookieName, verifyAdminSessionToken } from "@/src/lib/adminSession";
import { DEFAULT_PAYMENT_METHOD, getPaymentMethodLabelKey, isPaymentMethod } from "@/src/lib/paymentMethod";
import { isOrderStatus, ORDER_STATUSES } from "@/src/lib/orderStatus";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";

const ORDERS_PER_PAGE = 20;

type OrderRow = {
  id: string;
  order_code: string;
  customer_name: string;
  email: string;
  status: string;
  payment_method: string | null;
  total_amount: number | null;
  created_at: string;
};

const resolveAdminLocale = async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  return cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;
};

const normalizeQueryValue = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "";
};

const formatAdminDate = (value: string, locale: Locale) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "ka" ? "ka-GE" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const buildOrdersHref = ({
  page,
  status,
  code,
  email,
}: {
  page: number;
  status: string;
  code: string;
  email: string;
}) => {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (status) params.set("status", status);
  if (code) params.set("code", code);
  if (email) params.set("email", email);
  const query = params.toString();
  return query ? `/admin/orders?${query}` : "/admin/orders";
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    code?: string;
    email?: string;
    result?: string;
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
  const currentPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const statusParam = params.status ?? "";
  const selectedStatus = isOrderStatus(statusParam)
    ? statusParam
    : "";
  const codeFilter = normalizeQueryValue(params.code);
  const emailFilter = normalizeQueryValue(params.email);
  const resultCode = normalizeQueryValue(params.result);
  const from = (currentPage - 1) * ORDERS_PER_PAGE;
  const to = from + ORDERS_PER_PAGE - 1;
  const returnTo = buildOrdersHref({
    page: currentPage,
    status: selectedStatus,
    code: codeFilter,
    email: emailFilter,
  });

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("orders")
    .select(
      "id, order_code, customer_name, email, status, payment_method, total_amount, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (selectedStatus) {
    query = query.eq("status", selectedStatus);
  }

  if (codeFilter) {
    query = query.ilike("order_code", `%${codeFilter}%`);
  }

  if (emailFilter) {
    query = query.ilike("email", `%${emailFilter}%`);
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    throw new Error(`[admin.orders] Failed to fetch orders: ${error.message}`);
  }

  const orders = (data ?? []) as OrderRow[];
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ORDERS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const resultMessage =
    resultCode === "updated"
      ? t(dict, "admin.orders.result.updated")
      : resultCode === "invalid_status"
        ? t(dict, "admin.orders.result.invalidStatus")
        : resultCode === "invalid_order"
          ? t(dict, "admin.orders.result.invalidOrder")
          : resultCode === "unauthorized"
            ? t(dict, "admin.orders.result.unauthorized")
            : resultCode === "temporary_error"
              ? t(dict, "admin.orders.result.temporaryError")
              : null;
  const resultTone =
    resultCode === "updated"
      ? "text-[#2f6f4f]"
      : resultCode
        ? "text-[#8a2f2f]"
        : null;
  const previousHref =
    safePage > 1
      ? buildOrdersHref({
          page: safePage - 1,
          status: selectedStatus,
          code: codeFilter,
          email: emailFilter,
        })
      : null;
  const nextHref =
    safePage < totalPages
      ? buildOrdersHref({
          page: safePage + 1,
          status: selectedStatus,
          code: codeFilter,
          email: emailFilter,
        })
      : null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="ui-overline">{t(dict, "admin.orders.kicker")}</p>
            <h1 className="font-display text-[2rem] leading-tight text-[color:var(--text-strong)]">
              {t(dict, "admin.orders.title")}
            </h1>
            <p className="text-sm leading-7 text-[color:var(--text-body)]">
              {t(dict, "admin.orders.body")}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/dashboard" className="ui-button-secondary whitespace-nowrap">
              {t(dict, "admin.orders.backToDashboard")}
            </Link>
            <form action="/api/admin/logout" method="post">
              <button type="submit" className="ui-button-secondary whitespace-nowrap">
                {t(dict, "admin.dashboard.logout")}
              </button>
            </form>
          </div>
        </div>

        <div className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6 sm:py-6">
          <form className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div className="space-y-1.5">
              <label htmlFor="status" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                {t(dict, "admin.orders.filter.status")}
              </label>
              <select
                id="status"
                name="status"
                defaultValue={selectedStatus}
                className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
              >
                <option value="">{t(dict, "admin.orders.filter.allStatuses")}</option>
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(dict, `admin.orders.status.${status}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="code" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                {t(dict, "admin.orders.filter.orderCode")}
              </label>
              <input
                id="code"
                name="code"
                defaultValue={codeFilter}
                className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                {t(dict, "admin.orders.filter.email")}
              </label>
              <input
                id="email"
                name="email"
                defaultValue={emailFilter}
                className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
              />
            </div>

            <div className="flex items-end gap-3">
              <button type="submit" className="ui-button-primary whitespace-nowrap">
                {t(dict, "admin.orders.filter.apply")}
              </button>
              <Link href="/admin/orders" className="ui-button-secondary whitespace-nowrap">
                {t(dict, "admin.orders.filter.reset")}
              </Link>
            </div>
          </form>
        </div>

        {resultMessage && resultTone ? (
          <div className="ui-card border border-[var(--border-soft)] px-5 py-4 sm:px-6">
            <p className={`text-sm leading-6 ${resultTone}`}>{resultMessage}</p>
          </div>
        ) : null}

        <div className="ui-card overflow-hidden border border-[var(--border-soft)]">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border-soft)] bg-[#f5efe6] text-left text-[color:var(--text-muted)]">
                  <th className="px-4 py-3 font-medium">{t(dict, "admin.orders.table.orderCode")}</th>
                  <th className="px-4 py-3 font-medium">{t(dict, "admin.orders.table.customer")}</th>
                  <th className="px-4 py-3 font-medium">{t(dict, "admin.orders.table.email")}</th>
                  <th className="px-4 py-3 font-medium">{t(dict, "admin.orders.table.createdAt")}</th>
                  <th className="px-4 py-3 font-medium">{t(dict, "admin.orders.table.total")}</th>
                  <th className="px-4 py-3 font-medium">{t(dict, "admin.orders.table.paymentMethod")}</th>
                  <th className="px-4 py-3 font-medium">{t(dict, "admin.orders.table.status")}</th>
                  <th className="px-4 py-3 font-medium">{t(dict, "admin.orders.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.length > 0 ? (
                  orders.map((order) => {
                    const paymentMethodRaw = order.payment_method ?? "";
                    const paymentMethod = isPaymentMethod(paymentMethodRaw)
                      ? paymentMethodRaw
                      : DEFAULT_PAYMENT_METHOD;

                    return (
                      <tr key={order.id} className="border-b border-[var(--border-soft)] last:border-b-0">
                        <td className="px-4 py-3 font-medium text-[color:var(--text-strong)]">
                          {order.order_code}
                        </td>
                        <td className="px-4 py-3 text-[color:var(--text-body)]">{order.customer_name}</td>
                        <td className="px-4 py-3 text-[color:var(--text-body)]">{order.email}</td>
                        <td className="px-4 py-3 text-[color:var(--text-body)]">
                          {formatAdminDate(order.created_at, locale)}
                        </td>
                        <td className="px-4 py-3 text-[color:var(--text-body)]">
                          {order.total_amount ?? 0} ₾
                        </td>
                        <td className="px-4 py-3 text-[color:var(--text-body)]">
                          {t(dict, getPaymentMethodLabelKey(paymentMethod))}
                        </td>
                        <td className="px-4 py-3 text-[color:var(--text-body)]">
                          {t(dict, `admin.orders.status.${order.status}`)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex min-w-[340px] items-center gap-2">
                            <Link
                              href={`/admin/orders/${encodeURIComponent(order.order_code)}`}
                              className="ui-button-secondary min-h-[42px] whitespace-nowrap px-4"
                            >
                              {t(dict, "admin.orders.actions.view")}
                            </Link>
                            <form
                              action="/api/admin/orders/status"
                              method="post"
                              className="flex min-w-0 flex-1 items-center gap-2"
                            >
                              <input type="hidden" name="orderId" value={order.id} />
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <select
                                name="status"
                                defaultValue={isOrderStatus(order.status) ? order.status : ""}
                                className="min-w-0 flex-1 rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-3 py-2 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                              >
                                {!isOrderStatus(order.status) ? (
                                  <option value="" disabled>
                                    {t(dict, `admin.orders.status.${order.status}`)}
                                  </option>
                                ) : null}
                                {ORDER_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {t(dict, `admin.orders.status.${status}`)}
                                  </option>
                                ))}
                              </select>
                              <button type="submit" className="ui-button-secondary min-h-[42px] whitespace-nowrap px-4">
                                {t(dict, "admin.orders.actions.save")}
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-[color:var(--text-muted)]"
                    >
                      {t(dict, "admin.orders.empty")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-sm text-[color:var(--text-body)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            {t(dict, "admin.orders.pagination.summary")} {totalCount}
          </p>
          <div className="flex items-center gap-3">
            {previousHref ? (
              <Link href={previousHref} className="ui-button-secondary whitespace-nowrap">
                {t(dict, "admin.orders.pagination.previous")}
              </Link>
            ) : null}
            <span className="text-[color:var(--text-muted)]">
              {t(dict, "admin.orders.pagination.page")} {safePage} / {totalPages}
            </span>
            {nextHref ? (
              <Link href={nextHref} className="ui-button-secondary whitespace-nowrap">
                {t(dict, "admin.orders.pagination.next")}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
