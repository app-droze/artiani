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
}: {
  params: Promise<{ orderCode: string }>;
}) {
  const [{ orderCode }, cookieStore, locale] = await Promise.all([
    params,
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

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, order_code, customer_name, email, phone, address, note, status, payment_method, total_amount, currency, lang, created_at",
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

  const items = (itemRows ?? []) as AdminOrderItemRow[];
  const subtotal = items.reduce((sum, item) => sum + asNumber(item.line_total), 0);
  const total = asNumber(order.total_amount);
  const shipping = Math.max(0, total - subtotal);

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
      </div>
    </main>
  );
}
