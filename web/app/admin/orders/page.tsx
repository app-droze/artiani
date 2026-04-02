import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import { defaultLocale, isLocale, type Locale } from "@/src/i18n/locales";
import { getAdminSessionCookieName, verifyAdminSessionToken } from "@/src/lib/adminSession";
import { ADMIN_TONES, getAdminFeedbackTone, getAdminStatusTone } from "@/src/lib/adminUi";
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
  delivery_area: string | null;
  created_at: string;
};

type OrderRowWithDeadline = OrderRow & {
  delivery_deadline: Date;
  is_active_pipeline: boolean;
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

const normalizeQueryValue = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "";
};

const formatAdminDate = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : "";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}.${month}.${year}`;
};

const formatMoneyInline = (value: number | null | undefined) => `${value ?? 0}\u00A0₾`;

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

const getDeadlineTone = (deadline: Date, status: string) => {
  if (!isActivePipelineStatus(status)) {
    return ADMIN_TONES.neutral;
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const deadlineStart = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  const diffDays = Math.round((deadlineStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return ADMIN_TONES.expense;
  }
  if (diffDays <= 1) {
    return ADMIN_TONES.warning;
  }
  return ADMIN_TONES.neutral;
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

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("orders")
    .select(
      "id, order_code, customer_name, email, status, payment_method, total_amount, delivery_area, created_at",
      { count: "exact" },
    );

  if (selectedStatus) {
    query = query.eq("status", selectedStatus);
  }

  if (codeFilter) {
    query = query.ilike("order_code", `%${codeFilter}%`);
  }

  if (emailFilter) {
    query = query.ilike("email", `%${emailFilter}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`[admin.orders] Failed to fetch orders: ${error.message}`);
  }

  const sortedOrders = ((data ?? []) as OrderRow[])
    .map((order) => ({
      ...order,
      delivery_deadline: addWorkingDays(order.created_at, getDeliveryWorkingDays(order.delivery_area)),
      is_active_pipeline: isActivePipelineStatus(order.status),
    }))
    .sort((left, right) => {
      if (left.is_active_pipeline !== right.is_active_pipeline) {
        return left.is_active_pipeline ? -1 : 1;
      }

      const deliveryDiff = left.delivery_deadline.getTime() - right.delivery_deadline.getTime();
      if (deliveryDiff !== 0) {
        return deliveryDiff;
      }

      return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
    });

  const totalCount = count ?? sortedOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / ORDERS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const from = (safePage - 1) * ORDERS_PER_PAGE;
  const to = from + ORDERS_PER_PAGE;
  const orders = sortedOrders.slice(from, to) as OrderRowWithDeadline[];
  const returnTo = buildOrdersHref({
    page: safePage,
    status: selectedStatus,
    code: codeFilter,
    email: emailFilter,
  });
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
      ? ADMIN_TONES[getAdminFeedbackTone(true)]
      : resultCode
        ? ADMIN_TONES[getAdminFeedbackTone(false)]
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
          <div className={`ui-card border px-5 py-4 sm:px-6 ${resultTone.surface}`}>
            <p className={`text-sm leading-6 ${resultTone.text}`}>{resultMessage}</p>
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
                  <th className="px-4 py-3 font-medium">{t(dict, "admin.orders.table.deliveryBy")}</th>
                  <th className="px-4 py-3 font-medium">{t(dict, "admin.orders.table.createdAt")}</th>
                  <th className="px-4 py-3 font-medium">{t(dict, "admin.orders.table.total")}</th>
                  <th className="px-4 py-3 font-medium">{t(dict, "admin.orders.table.paymentMethod")}</th>
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
                    const detailHref = `/admin/orders/${encodeURIComponent(order.order_code)}?returnTo=${encodeURIComponent(returnTo)}`;
                    const statusTone = ADMIN_TONES[getAdminStatusTone(order.status)];
                    const deadlineTone = getDeadlineTone(order.delivery_deadline, order.status);

                    return (
                      <tr
                        key={order.id}
                        className="border-b border-[var(--border-soft)] transition-colors hover:bg-[#faf6f0] last:border-b-0"
                      >
                        <td className="px-4 py-3 font-medium text-[color:var(--text-strong)]">
                          <Link href={detailHref} className="block -mx-4 -my-3 px-4 py-3">
                            {order.order_code}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-[color:var(--text-body)]">
                          <Link href={detailHref} className="block -mx-4 -my-3 px-4 py-3">
                            {order.customer_name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-[color:var(--text-body)]">
                          <Link href={detailHref} className="block -mx-4 -my-3 px-4 py-3">
                            {order.email}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-[color:var(--text-body)]">
                          <Link href={detailHref} className={`block -mx-4 -my-3 px-4 py-3 ${deadlineTone.text}`}>
                            {formatAdminDate(order.delivery_deadline)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-[color:var(--text-body)]">
                          <Link href={detailHref} className="block -mx-4 -my-3 px-4 py-3">
                            {formatAdminDate(order.created_at)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-[color:var(--text-body)]">
                          <Link href={detailHref} className={`block -mx-4 -my-3 px-4 py-3 whitespace-nowrap ${ADMIN_TONES.income.text}`}>
                            {formatMoneyInline(order.total_amount)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-[color:var(--text-body)]">
                          <Link href={detailHref} className="block -mx-4 -my-3 px-4 py-3">
                            {t(dict, getPaymentMethodLabelKey(paymentMethod))}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex min-w-[220px] items-center gap-2">
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
                                className={`min-w-0 flex-1 rounded-[1rem] border bg-white/80 px-3 py-2 text-sm outline-none transition-colors focus:border-black/20 ${statusTone.surface} ${statusTone.text}`}
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
