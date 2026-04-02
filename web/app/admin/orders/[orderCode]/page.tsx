import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import { defaultLocale, isLocale, type Locale } from "@/src/i18n/locales";
import { getAdminSessionCookieName, verifyAdminSessionToken } from "@/src/lib/adminSession";
import {
  ADMIN_TONES,
  type AdminToneName,
  getAdminFeedbackTone,
  getAdminStatusTone,
  getSignedMoneyTone,
} from "@/src/lib/adminUi";
import { DEFAULT_PAYMENT_METHOD, getPaymentMethodLabelKey, isPaymentMethod } from "@/src/lib/paymentMethod";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";
import { isOrderStatus, ORDER_STATUSES } from "@/src/lib/orderStatus";

type AdminOrderRow = {
  id: string;
  order_code: string;
  customer_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  status: string;
  payment_method: string | null;
  subtotal_amount: number | null;
  shipping_amount: number | null;
  total_amount: number | null;
  currency: string | null;
  lang: string | null;
  created_at: string;
};

type AdminOrderItemRow = {
  id: string;
  qty: number;
  unit_price: number | string;
  line_total: number | string;
  snapshot_title: string | null;
  snapshot_title_en: string | null;
  snapshot_title_ka: string | null;
  snapshot_variant: string | null;
  snapshot_product_slug: string | null;
  snapshot_product_type: string | null;
};

type OrderDeliveryCostRow = {
  id: string;
  provider: string | null;
  amount: number | string;
  notes: string | null;
  created_at: string;
};

type OrderMiscCostRow = {
  id: string;
  cost_category: string;
  description: string;
  amount: number | string;
  notes: string | null;
  created_at: string;
};

type OrderProfitRow = {
  line_profit_amount: number | string | null;
  has_cost_rule: boolean;
};

const resolveAdminLocale = async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  return cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;
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

const formatMoney = (value: number | null | undefined) => `${value ?? 0} ₾`;

const asNumber = (value: number | string | null | undefined) => {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sanitizeReturnTo = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.startsWith("/admin") ? trimmed : "/admin/orders";
};

const resolveBackLabel = (returnTo: string, dict: Record<string, string>) => {
  if (returnTo.startsWith("/admin/reports")) {
    return t(dict, "admin.orderDetail.reportsLink");
  }

  if (returnTo.startsWith("/admin/dashboard")) {
    return t(dict, "admin.orders.backToDashboard");
  }

  if (returnTo.startsWith("/admin/fulfillment")) {
    return t(dict, "admin.dashboard.fulfillmentLink");
  }

  if (returnTo.startsWith("/admin/inventory")) {
    return t(dict, "admin.dashboard.inventoryLink");
  }

  return t(dict, "admin.orderDetail.backToOrders");
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

const getProductTypeLabel = (productType: string | null, dict: Record<string, string>) =>
  productType ? (dict[`catalogue.types.${productType}`] ?? productType) : null;

const pickItemTitle = (item: AdminOrderItemRow, locale: Locale, dict: Record<string, string>) => {
  const name =
    locale === "ka"
      ? item.snapshot_title_ka ?? item.snapshot_title_en ?? item.snapshot_title ?? "—"
      : item.snapshot_title_en ?? item.snapshot_title_ka ?? item.snapshot_title ?? "—";
  return buildProductTitle({ productType: item.snapshot_product_type, name, dict });
};

const MetricCard = ({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: AdminToneName;
}) => (
  <div className={`rounded-[1.2rem] border px-4 py-4 ${ADMIN_TONES[tone].surface}`}>
    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{label}</p>
    <p className={`mt-2 text-[1.45rem] font-semibold leading-none ${ADMIN_TONES[tone].text}`}>{value}</p>
  </div>
);

const DetailField = ({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: AdminToneName;
}) => (
  <div className="space-y-1">
    <dt className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{label}</dt>
    <dd className={`text-sm leading-6 ${ADMIN_TONES[tone].text}`}>{value}</dd>
  </div>
);

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderCode: string }>;
  searchParams: Promise<{ result?: string; returnTo?: string }>;
}) {
  const [{ orderCode }, paramsState, cookieStore, locale] = await Promise.all([
    params,
    searchParams,
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
  const resultCode = (paramsState.result ?? "").trim();
  const backHref = sanitizeReturnTo(paramsState.returnTo);
  const backLabel = resolveBackLabel(backHref, dict);

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, order_code, customer_name, email, phone, address, note, status, payment_method, subtotal_amount, shipping_amount, total_amount, currency, lang, created_at",
    )
    .eq("order_code", decodeURIComponent(orderCode))
    .maybeSingle();

  if (orderError) {
    throw new Error(`[admin.order] Failed to fetch order: ${orderError.message}`);
  }

  if (!orderData) {
    notFound();
  }

  const order = orderData as AdminOrderRow;
  const paymentMethodRaw = order.payment_method ?? "";
  const paymentMethod = isPaymentMethod(paymentMethodRaw)
    ? paymentMethodRaw
    : DEFAULT_PAYMENT_METHOD;

  const [
    { data: itemRows, error: itemError },
    { data: deliveryCostData, error: deliveryCostError },
    { data: miscCostData, error: miscCostError },
    { data: orderProfitData, error: orderProfitError },
  ] = await Promise.all([
    supabase
      .from("order_items")
      .select(
        "id, qty, unit_price, line_total, snapshot_title, snapshot_title_en, snapshot_title_ka, snapshot_variant, snapshot_product_slug, snapshot_product_type",
      )
      .eq("order_id", order.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("order_delivery_costs")
      .select("id, provider, amount, notes, created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("order_misc_costs")
      .select("id, cost_category, description, amount, notes, created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reporting_order_line_item_profit_v1")
      .select("line_profit_amount, has_cost_rule")
      .eq("order_code", order.order_code),
  ]);

  if (itemError) {
    throw new Error(`[admin.order] Failed to fetch order items: ${itemError.message}`);
  }
  if (deliveryCostError) {
    throw new Error(`[admin.order] Failed to fetch delivery costs: ${deliveryCostError.message}`);
  }
  if (miscCostError) {
    throw new Error(`[admin.order] Failed to fetch extra costs: ${miscCostError.message}`);
  }
  if (orderProfitError) {
    throw new Error(`[admin.order] Failed to fetch order profit: ${orderProfitError.message}`);
  }

  const items = (itemRows ?? []) as AdminOrderItemRow[];
  const deliveryCosts = (deliveryCostData ?? []) as OrderDeliveryCostRow[];
  const miscCosts = (miscCostData ?? []) as OrderMiscCostRow[];
  const orderProfitRows = (orderProfitData ?? []) as OrderProfitRow[];

  const subtotal =
    order.subtotal_amount == null
      ? items.reduce((sum, item) => sum + asNumber(item.line_total), 0)
      : asNumber(order.subtotal_amount);
  const shipping = order.shipping_amount == null ? Math.max(0, asNumber(order.total_amount) - subtotal) : asNumber(order.shipping_amount);
  const miscTotal = miscCosts.reduce((sum, entry) => sum + asNumber(entry.amount), 0);
  const explicitDeliveryTotal = deliveryCosts.reduce((sum, entry) => sum + asNumber(entry.amount), 0);
  const effectiveDeliveryCost = deliveryCosts.length > 0 ? explicitDeliveryTotal : shipping;
  const hasCompleteProfitCoverage = orderProfitRows.length > 0 && orderProfitRows.every((row) => row.has_cost_rule);
  const totalProfit = hasCompleteProfitCoverage
    ? orderProfitRows.reduce((sum, row) => sum + asNumber(row.line_profit_amount), 0)
    : null;
  const returnTo = `/admin/orders/${encodeURIComponent(order.order_code)}?returnTo=${encodeURIComponent(backHref)}`;

  const resultMessage =
    resultCode === "updated"
      ? t(dict, "admin.orders.result.updated")
      : resultCode === "delivery_added"
          ? t(dict, "admin.fulfillment.result.deliveryAdded")
          : resultCode === "misc_added"
            ? t(dict, "admin.fulfillment.result.miscAdded")
            : resultCode === "invalid_fulfillment"
                  ? t(dict, "admin.fulfillment.result.invalid")
                  : resultCode === "invalid_order"
                    ? t(dict, "admin.orders.result.invalidOrder")
                    : resultCode === "invalid_status"
                      ? t(dict, "admin.orders.result.invalidStatus")
                      : resultCode === "unauthorized"
                        ? t(dict, "admin.fulfillment.result.unauthorized")
                        : resultCode === "temporary_error"
                          ? t(dict, "admin.fulfillment.result.temporaryError")
                          : null;

  const resultTone =
    resultCode === "updated" || resultCode === "delivery_added" || resultCode === "misc_added"
      ? ADMIN_TONES[getAdminFeedbackTone(true)]
      : resultCode
        ? ADMIN_TONES[getAdminFeedbackTone(false)]
        : null;
  const statusTone = ADMIN_TONES[getAdminStatusTone(order.status)];
  const paymentTone = paymentMethod === "bank_transfer" ? ADMIN_TONES.info : ADMIN_TONES.warning;
  const totalTone = ADMIN_TONES.income;
  const costTone = ADMIN_TONES.expense;
  const profitToneName: AdminToneName = totalProfit == null ? "warning" : getSignedMoneyTone(totalProfit);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <Link href={backHref} className="ui-button-secondary inline-flex w-fit items-center gap-2 whitespace-nowrap">
              <span aria-hidden="true">&larr;</span>
              <span>{backLabel}</span>
            </Link>
            <p className="ui-overline">{t(dict, "admin.orderDetail.kicker")}</p>
            <div className="space-y-2">
              <h1 className="font-display text-[2.2rem] leading-tight text-[color:var(--text-strong)]">
                {order.order_code}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-[color:var(--text-body)]">
                {t(dict, "admin.orderDetail.body")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
              <span className={`rounded-full border px-3 py-1.5 ${statusTone.surface} ${statusTone.text}`}>
                {t(dict, `admin.orders.status.${order.status}`)}
              </span>
              <span className={`rounded-full border px-3 py-1.5 ${paymentTone.surface} ${paymentTone.text}`}>
                {t(dict, getPaymentMethodLabelKey(paymentMethod))}
              </span>
              <span className={`rounded-full border px-3 py-1.5 ${ADMIN_TONES.neutral.surface} ${ADMIN_TONES.neutral.text}`}>
                {formatAdminDate(order.created_at, locale)}
              </span>
            </div>
          </div>
        </div>

        {resultMessage && resultTone ? (
          <div className={`ui-card border px-5 py-4 sm:px-6 ${resultTone.surface}`}>
            <p className={`text-sm leading-6 ${resultTone.text}`}>{resultMessage}</p>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard label={t(dict, "admin.orderDetail.total")} value={formatMoney(asNumber(order.total_amount))} tone="income" />
          <MetricCard label={t(dict, "admin.orderDetail.subtotal")} value={formatMoney(subtotal)} tone="income" />
          <MetricCard label={t(dict, "admin.orderDetail.orderProfit")} value={totalProfit == null ? "—" : formatMoney(totalProfit)} tone={profitToneName} />
          <MetricCard label={t(dict, "admin.orderDetail.shipping")} value={formatMoney(shipping)} tone="info" />
          <MetricCard label={t(dict, "admin.orderDetail.extraCosts")} value={formatMoney(miscTotal)} tone="expense" />
          <MetricCard label={t(dict, "admin.orderDetail.deliveryCost")} value={formatMoney(effectiveDeliveryCost)} tone="expense" />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6">
            <div className="space-y-4">
              <h2 className="ui-overline">{t(dict, "admin.orderDetail.customerBlockTitle")}</h2>
              <dl className="grid gap-4">
                <DetailField label={t(dict, "admin.orderDetail.customerName")} value={order.customer_name} />
                <DetailField label={t(dict, "admin.orderDetail.email")} value={order.email} />
                <DetailField label={t(dict, "admin.orderDetail.phone")} value={order.phone ?? "—"} />
                <DetailField label={t(dict, "admin.orderDetail.address")} value={order.address ?? "—"} />
                <DetailField label={t(dict, "admin.orderDetail.note")} value={order.note ?? "—"} />
              </dl>
            </div>
          </section>

          <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6">
            <div className="space-y-4">
              <h2 className="ui-overline">{t(dict, "admin.orderDetail.orderMetaTitle")}</h2>
              <dl className="grid gap-4">
                <DetailField label={t(dict, "admin.orderDetail.orderCode")} value={order.order_code} />
                <DetailField label={t(dict, "admin.orderDetail.language")} value={order.lang ?? "—"} />
                <DetailField label={t(dict, "admin.orderDetail.currency")} value={order.currency ?? "—"} />
                <DetailField label={t(dict, "admin.orderDetail.paymentMethod")} value={t(dict, getPaymentMethodLabelKey(paymentMethod))} tone={paymentMethod === "bank_transfer" ? "info" : "warning"} />
                <div className="space-y-1">
                  <dt className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                    {t(dict, "admin.orderDetail.status")}
                  </dt>
                  <form action="/api/admin/orders/status" method="post" className="flex flex-col gap-3 sm:flex-row">
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <select
                      name="status"
                      defaultValue={isOrderStatus(order.status) ? order.status : ""}
                      className="min-w-0 flex-1 rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
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
                    <button type="submit" className="ui-button-secondary whitespace-nowrap">
                      {t(dict, "admin.orders.actions.save")}
                    </button>
                  </form>
                </div>
              </dl>
            </div>
          </section>

        </div>

        <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="ui-overline">{t(dict, "admin.orderDetail.itemsTitle")}</h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-body)]">
                  {t(dict, "admin.orderDetail.itemsBody")}
                </p>
              </div>
            </div>

            {items.length > 0 ? (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <p className="font-medium text-[color:var(--text-strong)]">
                          {pickItemTitle(item, locale, dict)}
                        </p>
                        {item.snapshot_variant ? (
                          <p className="text-sm leading-6 text-[color:var(--text-body)]">{item.snapshot_variant}</p>
                        ) : null}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm leading-6 text-[color:var(--text-muted)]">
                          <span>{t(dict, "admin.orderDetail.itemQty")}: {item.qty}</span>
                          <span>{t(dict, "admin.orderDetail.itemUnitPrice")}: {formatMoney(asNumber(item.unit_price))}</span>
                          {getProductTypeLabel(item.snapshot_product_type, dict) ? (
                            <span>{t(dict, "admin.orderDetail.itemType")}: {getProductTypeLabel(item.snapshot_product_type, dict)}</span>
                          ) : null}
                          {item.snapshot_product_slug ? (
                            <span>{t(dict, "admin.orderDetail.itemSlug")}: {item.snapshot_product_slug}</span>
                          ) : null}
                        </div>
                      </div>
                      <p className={`text-sm font-medium leading-6 ${totalTone.text}`}>
                        {formatMoney(asNumber(item.line_total))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                {t(dict, "admin.orderDetail.empty")}
              </p>
            )}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6">
            <div className="space-y-4">
              <div>
                <h2 className="ui-overline">{t(dict, "admin.orderDetail.deliveryCostsTitle")}</h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-body)]">
                  {t(dict, "admin.orderDetail.deliveryCostsBody")}
                </p>
              </div>

              {deliveryCosts.length > 0 ? (
                <div className="space-y-3">
                  {deliveryCosts.map((entry) => (
                    <div key={entry.id} className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium text-[color:var(--text-strong)]">
                            {entry.provider?.trim() ? entry.provider : t(dict, "admin.orderDetail.deliveryProviderFallback")}
                          </p>
                          <p className={`text-sm font-medium ${costTone.text}`}>{formatMoney(asNumber(entry.amount))}</p>
                        </div>
                        <p className="text-sm leading-6 text-[color:var(--text-muted)]">{formatAdminDate(entry.created_at, locale)}</p>
                        {entry.notes ? (
                          <p className="text-sm leading-6 text-[color:var(--text-body)]">{entry.notes}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                  {t(dict, "admin.orderDetail.deliveryCostsEmpty")}
                </p>
              )}

              <form action="/api/admin/orders/delivery-cost" method="post" className={`space-y-4 rounded-[1rem] border px-4 py-4 ${ADMIN_TONES.info.surface}`}>
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
                  <div className="space-y-1.5">
                    <label htmlFor="delivery-amount" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.orderDetail.deliveryForm.amount")}
                    </label>
                    <input
                      id="delivery-amount"
                      name="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="delivery-provider" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.orderDetail.deliveryForm.provider")}
                    </label>
                    <input
                      id="delivery-provider"
                      name="provider"
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="delivery-notes" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                    {t(dict, "admin.orderDetail.deliveryForm.notes")}
                  </label>
                  <input
                    id="delivery-notes"
                    name="notes"
                    className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                  />
                </div>
                <button type="submit" className="ui-button-secondary whitespace-nowrap">
                  {t(dict, "admin.orderDetail.deliveryForm.submit")}
                </button>
              </form>
            </div>
          </section>

          <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6">
            <div className="space-y-4">
              <div>
                <h2 className="ui-overline">{t(dict, "admin.orderDetail.extraCostsTitle")}</h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-body)]">
                  {t(dict, "admin.orderDetail.extraCostsBody")}
                </p>
              </div>

              {miscCosts.length > 0 ? (
                <div className="space-y-3">
                  {miscCosts.map((entry) => (
                    <div key={entry.id} className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-[color:var(--text-strong)]">{entry.description}</p>
                            <p className="text-sm leading-6 text-[color:var(--text-muted)]">{entry.cost_category}</p>
                          </div>
                          <p className={`text-sm font-medium ${costTone.text}`}>{formatMoney(asNumber(entry.amount))}</p>
                        </div>
                        <p className="text-sm leading-6 text-[color:var(--text-muted)]">{formatAdminDate(entry.created_at, locale)}</p>
                        {entry.notes ? (
                          <p className="text-sm leading-6 text-[color:var(--text-body)]">{entry.notes}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                  {t(dict, "admin.orderDetail.extraCostsEmpty")}
                </p>
              )}

              <form action="/api/admin/orders/misc-cost" method="post" className={`space-y-4 rounded-[1rem] border px-4 py-4 ${ADMIN_TONES.expense.surface}`}>
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <div className="space-y-1.5">
                  <label htmlFor="misc-category" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                    {t(dict, "admin.orderDetail.extraCostsForm.category")}
                  </label>
                  <input
                    id="misc-category"
                    name="costCategory"
                    className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="misc-description" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                    {t(dict, "admin.orderDetail.extraCostsForm.description")}
                  </label>
                  <input
                    id="misc-description"
                    name="description"
                    className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
                  <div className="space-y-1.5">
                    <label htmlFor="misc-amount" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.orderDetail.extraCostsForm.amount")}
                    </label>
                    <input
                      id="misc-amount"
                      name="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="misc-notes" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.orderDetail.extraCostsForm.notes")}
                    </label>
                    <input
                      id="misc-notes"
                      name="notes"
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>
                </div>
                <button type="submit" className="ui-button-secondary whitespace-nowrap">
                  {t(dict, "admin.orderDetail.extraCostsForm.submit")}
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
