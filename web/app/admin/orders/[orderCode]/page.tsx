import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import { defaultLocale, isLocale, type Locale } from "@/src/i18n/locales";
import { getAdminSessionCookieName, verifyAdminSessionToken } from "@/src/lib/adminSession";
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

type PackagingCatalogRow = {
  id: string;
  name: string;
  unit_cost: number | null;
};

type OrderPackagingUsageRow = {
  id: string;
  qty: number;
  unit_cost: number | string;
  packaging_name_snapshot: string;
  notes: string | null;
  created_at: string;
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

const pickItemTitle = (item: AdminOrderItemRow, locale: Locale) =>
  locale === "ka"
    ? item.snapshot_title_ka ?? item.snapshot_title_en ?? item.snapshot_title ?? "—"
    : item.snapshot_title_en ?? item.snapshot_title_ka ?? item.snapshot_title ?? "—";

const MetricCard = ({
  label,
  value,
  tone = "text-[color:var(--text-strong)]",
}: {
  label: string;
  value: string;
  tone?: string;
}) => (
  <div className="rounded-[1.2rem] border border-[var(--border-soft)] bg-[#faf6f0] px-4 py-4">
    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{label}</p>
    <p className={`mt-2 text-[1.45rem] font-semibold leading-none ${tone}`}>{value}</p>
  </div>
);

const DetailField = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="space-y-1">
    <dt className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{label}</dt>
    <dd className="text-sm leading-6 text-[color:var(--text-strong)]">{value}</dd>
  </div>
);

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderCode: string }>;
  searchParams: Promise<{ result?: string }>;
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

  const [{ data: itemRows, error: itemError }, { data: packagingCatalogData, error: packagingCatalogError }, { data: packagingUsageData, error: packagingUsageError }, { data: deliveryCostData, error: deliveryCostError }, { data: miscCostData, error: miscCostError }] = await Promise.all([
    supabase
      .from("order_items")
      .select(
        "id, qty, unit_price, line_total, snapshot_title, snapshot_title_en, snapshot_title_ka, snapshot_variant, snapshot_product_slug, snapshot_product_type",
      )
      .eq("order_id", order.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("packaging_catalog")
      .select("id, name, unit_cost")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("order_packaging_usage")
      .select("id, qty, unit_cost, packaging_name_snapshot, notes, created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false }),
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
  ]);

  if (itemError) {
    throw new Error(`[admin.order] Failed to fetch order items: ${itemError.message}`);
  }
  if (packagingCatalogError) {
    throw new Error(`[admin.order] Failed to fetch packaging catalog: ${packagingCatalogError.message}`);
  }
  if (packagingUsageError) {
    throw new Error(`[admin.order] Failed to fetch packaging usage: ${packagingUsageError.message}`);
  }
  if (deliveryCostError) {
    throw new Error(`[admin.order] Failed to fetch delivery costs: ${deliveryCostError.message}`);
  }
  if (miscCostError) {
    throw new Error(`[admin.order] Failed to fetch extra costs: ${miscCostError.message}`);
  }

  const items = (itemRows ?? []) as AdminOrderItemRow[];
  const packagingCatalog = (packagingCatalogData ?? []) as PackagingCatalogRow[];
  const packagingUsage = (packagingUsageData ?? []) as OrderPackagingUsageRow[];
  const deliveryCosts = (deliveryCostData ?? []) as OrderDeliveryCostRow[];
  const miscCosts = (miscCostData ?? []) as OrderMiscCostRow[];

  const subtotal =
    order.subtotal_amount == null
      ? items.reduce((sum, item) => sum + asNumber(item.line_total), 0)
      : asNumber(order.subtotal_amount);
  const shipping = order.shipping_amount == null ? Math.max(0, asNumber(order.total_amount) - subtotal) : asNumber(order.shipping_amount);
  const packagingTotal = packagingUsage.reduce((sum, entry) => sum + (asNumber(entry.unit_cost) * entry.qty), 0);
  const miscTotal = miscCosts.reduce((sum, entry) => sum + asNumber(entry.amount), 0);
  const explicitDeliveryTotal = deliveryCosts.reduce((sum, entry) => sum + asNumber(entry.amount), 0);
  const effectiveDeliveryCost = deliveryCosts.length > 0 ? explicitDeliveryTotal : shipping;
  const fulfillmentTotal = packagingTotal + miscTotal + effectiveDeliveryCost;
  const returnTo = `/admin/orders/${encodeURIComponent(order.order_code)}`;

  const resultMessage =
    resultCode === "updated"
      ? t(dict, "admin.orders.result.updated")
      : resultCode === "packaging_added"
        ? t(dict, "admin.fulfillment.result.packagingAdded")
        : resultCode === "delivery_added"
          ? t(dict, "admin.fulfillment.result.deliveryAdded")
          : resultCode === "misc_added"
            ? t(dict, "admin.fulfillment.result.miscAdded")
            : resultCode === "packaging_created"
              ? t(dict, "admin.fulfillment.result.packagingCreated")
              : resultCode === "duplicate_packaging"
                ? t(dict, "admin.fulfillment.result.duplicatePackaging")
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
    resultCode === "updated" || resultCode === "packaging_added" || resultCode === "delivery_added" || resultCode === "misc_added" || resultCode === "packaging_created"
      ? "text-[#2f6f4f]"
      : resultCode
        ? "text-[#8a2f2f]"
        : null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
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
              <span className="rounded-full border border-[var(--border-soft)] bg-[#faf6f0] px-3 py-1.5">
                {t(dict, `admin.orders.status.${order.status}`)}
              </span>
              <span className="rounded-full border border-[var(--border-soft)] bg-[#faf6f0] px-3 py-1.5">
                {t(dict, getPaymentMethodLabelKey(paymentMethod))}
              </span>
              <span className="rounded-full border border-[var(--border-soft)] bg-[#faf6f0] px-3 py-1.5">
                {formatAdminDate(order.created_at, locale)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin/reports" className="ui-button-secondary whitespace-nowrap">
              {t(dict, "admin.orderDetail.reportsLink")}
            </Link>
            <Link href="/admin/fulfillment" className="ui-button-secondary whitespace-nowrap">
              {t(dict, "admin.orderDetail.fulfillmentCatalog")}
            </Link>
            <Link href="/admin/orders" className="ui-button-secondary whitespace-nowrap">
              {t(dict, "admin.orderDetail.backToOrders")}
            </Link>
            <form action="/api/admin/logout" method="post">
              <button type="submit" className="ui-button-secondary whitespace-nowrap">
                {t(dict, "admin.dashboard.logout")}
              </button>
            </form>
          </div>
        </div>

        {resultMessage && resultTone ? (
          <div className="ui-card border border-[var(--border-soft)] px-5 py-4 sm:px-6">
            <p className={`text-sm leading-6 ${resultTone}`}>{resultMessage}</p>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard label={t(dict, "admin.orderDetail.subtotal")} value={formatMoney(subtotal)} />
          <MetricCard label={t(dict, "admin.orderDetail.shipping")} value={formatMoney(shipping)} />
          <MetricCard label={t(dict, "admin.orderDetail.packagingCost")} value={formatMoney(packagingTotal)} />
          <MetricCard label={t(dict, "admin.orderDetail.extraCosts")} value={formatMoney(miscTotal)} />
          <MetricCard label={t(dict, "admin.orderDetail.deliveryCost")} value={formatMoney(effectiveDeliveryCost)} />
          <MetricCard label={t(dict, "admin.orderDetail.total")} value={formatMoney(asNumber(order.total_amount))} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(300px,0.9fr)]">
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
                <DetailField label={t(dict, "admin.orderDetail.paymentMethod")} value={t(dict, getPaymentMethodLabelKey(paymentMethod))} />
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

          <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6">
            <div className="space-y-4">
              <h2 className="ui-overline">{t(dict, "admin.orderDetail.fulfillmentSummaryTitle")}</h2>
              <dl className="grid gap-4">
                <DetailField label={t(dict, "admin.orderDetail.packagingCost")} value={formatMoney(packagingTotal)} />
                <DetailField label={t(dict, "admin.orderDetail.extraCosts")} value={formatMoney(miscTotal)} />
                <DetailField label={t(dict, "admin.orderDetail.deliveryCost")} value={formatMoney(effectiveDeliveryCost)} />
                <DetailField label={t(dict, "admin.orderDetail.fulfillmentTotal")} value={formatMoney(fulfillmentTotal)} />
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
                          {pickItemTitle(item, locale)}
                        </p>
                        {item.snapshot_variant ? (
                          <p className="text-sm leading-6 text-[color:var(--text-body)]">{item.snapshot_variant}</p>
                        ) : null}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm leading-6 text-[color:var(--text-muted)]">
                          <span>{t(dict, "admin.orderDetail.itemQty")}: {item.qty}</span>
                          <span>{t(dict, "admin.orderDetail.itemUnitPrice")}: {formatMoney(asNumber(item.unit_price))}</span>
                          {item.snapshot_product_type ? (
                            <span>{t(dict, "admin.orderDetail.itemType")}: {item.snapshot_product_type}</span>
                          ) : null}
                          {item.snapshot_product_slug ? (
                            <span>{t(dict, "admin.orderDetail.itemSlug")}: {item.snapshot_product_slug}</span>
                          ) : null}
                        </div>
                      </div>
                      <p className="text-sm font-medium leading-6 text-[color:var(--text-strong)]">
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

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="ui-overline">{t(dict, "admin.orderDetail.packagingTitle")}</h2>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-body)]">
                    {t(dict, "admin.orderDetail.packagingBody")}
                  </p>
                </div>
                <Link href="/admin/fulfillment" className="ui-button-secondary whitespace-nowrap">
                  {t(dict, "admin.orderDetail.managePackaging")}
                </Link>
              </div>

              {packagingUsage.length > 0 ? (
                <div className="space-y-3">
                  {packagingUsage.map((entry) => {
                    const totalCost = asNumber(entry.unit_cost) * entry.qty;
                    return (
                      <div key={entry.id} className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-medium text-[color:var(--text-strong)]">{entry.packaging_name_snapshot}</p>
                            <p className="text-sm font-medium text-[color:var(--text-strong)]">{formatMoney(totalCost)}</p>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm leading-6 text-[color:var(--text-muted)]">
                            <span>{t(dict, "admin.orderDetail.itemQty")}: {entry.qty}</span>
                            <span>{t(dict, "admin.orderDetail.itemUnitPrice")}: {formatMoney(asNumber(entry.unit_cost))}</span>
                            <span>{formatAdminDate(entry.created_at, locale)}</span>
                          </div>
                          {entry.notes ? (
                            <p className="text-sm leading-6 text-[color:var(--text-body)]">{entry.notes}</p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                  {t(dict, "admin.orderDetail.packagingEmpty")}
                </p>
              )}

              <form action="/api/admin/orders/packaging" method="post" className="space-y-4 rounded-[1rem] border border-[var(--border-soft)] bg-[#faf6f0] px-4 py-4">
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <div className="space-y-1.5">
                  <label htmlFor="packaging-select" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                    {t(dict, "admin.orderDetail.packagingForm.packaging")}
                  </label>
                  <select
                    id="packaging-select"
                    name="packagingId"
                    defaultValue={packagingCatalog[0]?.id ?? ""}
                    className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                  >
                    {packagingCatalog.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} ({formatMoney(entry.unit_cost)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
                  <div className="space-y-1.5">
                    <label htmlFor="packaging-qty" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.orderDetail.packagingForm.qty")}
                    </label>
                    <input
                      id="packaging-qty"
                      name="qty"
                      type="number"
                      min="1"
                      step="1"
                      defaultValue="1"
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="packaging-notes" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.orderDetail.packagingForm.notes")}
                    </label>
                    <input
                      id="packaging-notes"
                      name="notes"
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>
                </div>
                <button type="submit" className="ui-button-secondary whitespace-nowrap" disabled={packagingCatalog.length === 0}>
                  {t(dict, "admin.orderDetail.packagingForm.submit")}
                </button>
              </form>
            </div>
          </section>

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
                          <p className="text-sm font-medium text-[color:var(--text-strong)]">{formatMoney(asNumber(entry.amount))}</p>
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

              <form action="/api/admin/orders/delivery-cost" method="post" className="space-y-4 rounded-[1rem] border border-[var(--border-soft)] bg-[#faf6f0] px-4 py-4">
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
                          <p className="text-sm font-medium text-[color:var(--text-strong)]">{formatMoney(asNumber(entry.amount))}</p>
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

              <form action="/api/admin/orders/misc-cost" method="post" className="space-y-4 rounded-[1rem] border border-[var(--border-soft)] bg-[#faf6f0] px-4 py-4">
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
