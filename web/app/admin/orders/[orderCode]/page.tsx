import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import { defaultLocale, isLocale, type Locale } from "@/src/i18n/locales";
import { getAdminSessionCookieName, verifyAdminSessionToken } from "@/src/lib/adminSession";
import { DEFAULT_PAYMENT_METHOD, getPaymentMethodLabelKey, isPaymentMethod } from "@/src/lib/paymentMethod";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";

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
  is_active: boolean;
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
  const paymentMethodLabel = t(
    dict,
    getPaymentMethodLabelKey(paymentMethod),
  );

  const { data: itemRows, error: itemError } = await supabase
    .from("order_items")
    .select(
      "id, qty, unit_price, line_total, snapshot_title, snapshot_title_en, snapshot_title_ka, snapshot_variant, snapshot_product_slug, snapshot_product_type",
    )
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });

  if (itemError) {
    throw new Error(`[admin.order] Failed to fetch order items: ${itemError.message}`);
  }

  const [{ data: packagingCatalogData, error: packagingCatalogError }, { data: packagingUsageData, error: packagingUsageError }, { data: deliveryCostData, error: deliveryCostError }] = await Promise.all([
    supabase
      .from("packaging_catalog")
      .select("id, name, unit_cost, is_active")
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
  ]);

  if (packagingCatalogError) {
    throw new Error(`[admin.order] Failed to fetch packaging catalog: ${packagingCatalogError.message}`);
  }

  if (packagingUsageError) {
    throw new Error(`[admin.order] Failed to fetch packaging usage: ${packagingUsageError.message}`);
  }

  if (deliveryCostError) {
    throw new Error(`[admin.order] Failed to fetch delivery costs: ${deliveryCostError.message}`);
  }

  const items = (itemRows ?? []) as AdminOrderItemRow[];
  const packagingCatalog = (packagingCatalogData ?? []) as PackagingCatalogRow[];
  const packagingUsage = (packagingUsageData ?? []) as OrderPackagingUsageRow[];
  const deliveryCosts = (deliveryCostData ?? []) as OrderDeliveryCostRow[];
  const subtotal =
    order.subtotal_amount == null
      ? items.reduce((sum, item) => sum + asNumber(item.line_total), 0)
      : asNumber(order.subtotal_amount);
  const total = asNumber(order.total_amount);
  const shipping =
    order.shipping_amount == null
      ? Math.max(0, total - subtotal)
      : asNumber(order.shipping_amount);
  const packagingTotal = packagingUsage.reduce((sum, entry) => sum + (asNumber(entry.unit_cost) * entry.qty), 0);
  const explicitDeliveryTotal = deliveryCosts.reduce((sum, entry) => sum + asNumber(entry.amount), 0);
  const effectiveDeliveryCost = deliveryCosts.length > 0 ? explicitDeliveryTotal : shipping;
  const returnTo = `/admin/orders/${encodeURIComponent(order.order_code)}`;
  const resultMessage =
    resultCode === "packaging_added"
      ? t(dict, "admin.fulfillment.result.packagingAdded")
      : resultCode === "delivery_added"
        ? t(dict, "admin.fulfillment.result.deliveryAdded")
        : resultCode === "packaging_created"
          ? t(dict, "admin.fulfillment.result.packagingCreated")
          : resultCode === "duplicate_packaging"
            ? t(dict, "admin.fulfillment.result.duplicatePackaging")
            : resultCode === "invalid_fulfillment"
              ? t(dict, "admin.fulfillment.result.invalid")
              : resultCode === "invalid_order"
                ? t(dict, "admin.orders.result.invalidOrder")
                : resultCode === "unauthorized"
                  ? t(dict, "admin.fulfillment.result.unauthorized")
                  : resultCode === "temporary_error"
                    ? t(dict, "admin.fulfillment.result.temporaryError")
                    : null;
  const resultTone =
    resultCode === "packaging_added" || resultCode === "delivery_added" || resultCode === "packaging_created"
      ? "text-[#2f6f4f]"
      : resultCode
        ? "text-[#8a2f2f]"
        : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="ui-overline">{t(dict, "admin.orderDetail.kicker")}</p>
            <h1 className="font-display text-[2rem] leading-tight text-[color:var(--text-strong)]">
              {order.order_code}
            </h1>
            <p className="text-sm leading-7 text-[color:var(--text-body)]">
              {t(dict, "admin.orderDetail.body")}
            </p>
          </div>
          <div className="flex gap-3">
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
          <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-4">
              <h2 className="ui-overline">{t(dict, "admin.orderDetail.summaryTitle")}</h2>
              <dl className="grid gap-3 text-sm text-[color:var(--text-body)]">
                <div className="flex flex-col gap-1">
                  <dt className="text-[13px] leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.orderDetail.orderCode")}</dt>
                  <dd className="font-medium text-[color:var(--text-strong)]">{order.order_code}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[13px] leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.orderDetail.status")}</dt>
                  <dd className="font-medium text-[color:var(--text-strong)]">{t(dict, `admin.orders.status.${order.status}`)}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[13px] leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.orderDetail.paymentMethod")}</dt>
                  <dd>{paymentMethodLabel}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[13px] leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.orderDetail.createdAt")}</dt>
                  <dd>{formatAdminDate(order.created_at, locale)}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[13px] leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.orderDetail.customerName")}</dt>
                  <dd>{order.customer_name}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[13px] leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.orderDetail.email")}</dt>
                  <dd>{order.email}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[13px] leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.orderDetail.phone")}</dt>
                  <dd>{order.phone ?? "—"}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[13px] leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.orderDetail.address")}</dt>
                  <dd>{order.address ?? "—"}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[13px] leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.orderDetail.note")}</dt>
                  <dd>{order.note ?? "—"}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[13px] leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.orderDetail.language")}</dt>
                  <dd>{order.lang ?? "—"}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[13px] leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.orderDetail.currency")}</dt>
                  <dd>{order.currency ?? "—"}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[13px] leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.orderDetail.subtotal")}</dt>
                  <dd>{formatMoney(subtotal)}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[13px] leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.orderDetail.shipping")}</dt>
                  <dd>{formatMoney(shipping)}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[13px] leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.orderDetail.total")}</dt>
                  <dd className="font-medium text-[color:var(--text-strong)]">{formatMoney(order.total_amount)}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[13px] leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.orderDetail.packagingCost")}</dt>
                  <dd>{formatMoney(packagingTotal)}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[13px] leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.orderDetail.deliveryCost")}</dt>
                  <dd>{formatMoney(effectiveDeliveryCost)}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-4">
              <h2 className="ui-overline">{t(dict, "admin.orderDetail.itemsTitle")}</h2>
              {items.length > 0 ? (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1.5">
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
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6 sm:py-6">
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
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <p className="font-medium text-[color:var(--text-strong)]">{entry.packaging_name_snapshot}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm leading-6 text-[color:var(--text-muted)]">
                              <span>{t(dict, "admin.orderDetail.itemQty")}: {entry.qty}</span>
                              <span>{t(dict, "admin.orderDetail.itemUnitPrice")}: {formatMoney(asNumber(entry.unit_cost))}</span>
                              <span>{formatAdminDate(entry.created_at, locale)}</span>
                            </div>
                            {entry.notes ? (
                              <p className="text-sm leading-6 text-[color:var(--text-body)]">{entry.notes}</p>
                            ) : null}
                          </div>
                          <p className="text-sm font-medium leading-6 text-[color:var(--text-strong)]">{formatMoney(totalCost)}</p>
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

              <form action="/api/admin/orders/packaging" method="post" className="space-y-4 rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <div className="space-y-1.5">
                  <label htmlFor="packaging-select" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                    {t(dict, "admin.orderDetail.packagingForm.packaging")}
                  </label>
                  <select
                    id="packaging-select"
                    name="packagingId"
                    className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    defaultValue={packagingCatalog[0]?.id ?? ""}
                  >
                    {packagingCatalog.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} ({formatMoney(entry.unit_cost)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
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
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="packaging-usage-notes" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.orderDetail.packagingForm.notes")}
                    </label>
                    <input
                      id="packaging-usage-notes"
                      name="notes"
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="ui-button-secondary whitespace-nowrap"
                  disabled={packagingCatalog.length === 0}
                >
                  {t(dict, "admin.orderDetail.packagingForm.submit")}
                </button>
              </form>
            </div>
          </section>

          <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6 sm:py-6">
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
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <p className="font-medium text-[color:var(--text-strong)]">
                            {entry.provider?.trim() ? entry.provider : t(dict, "admin.orderDetail.deliveryProviderFallback")}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm leading-6 text-[color:var(--text-muted)]">
                            <span>{formatAdminDate(entry.created_at, locale)}</span>
                          </div>
                          {entry.notes ? (
                            <p className="text-sm leading-6 text-[color:var(--text-body)]">{entry.notes}</p>
                          ) : null}
                        </div>
                        <p className="text-sm font-medium leading-6 text-[color:var(--text-strong)]">{formatMoney(asNumber(entry.amount))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                  {t(dict, "admin.orderDetail.deliveryCostsEmpty")}
                </p>
              )}

              <form action="/api/admin/orders/delivery-cost" method="post" className="space-y-4 rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                  <div className="space-y-1.5">
                    <label htmlFor="delivery-cost-amount" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.orderDetail.deliveryForm.amount")}
                    </label>
                    <input
                      id="delivery-cost-amount"
                      name="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="delivery-cost-provider" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.orderDetail.deliveryForm.provider")}
                    </label>
                    <input
                      id="delivery-cost-provider"
                      name="provider"
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="delivery-cost-notes" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                    {t(dict, "admin.orderDetail.deliveryForm.notes")}
                  </label>
                  <input
                    id="delivery-cost-notes"
                    name="notes"
                    className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                  />
                </div>
                <button type="submit" className="ui-button-secondary whitespace-nowrap">
                  {t(dict, "admin.orderDetail.deliveryForm.submit")}
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
