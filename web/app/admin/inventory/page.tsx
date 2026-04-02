import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import { defaultLocale, isLocale, type Locale } from "@/src/i18n/locales";
import { getAdminSessionCookieName, verifyAdminSessionToken } from "@/src/lib/adminSession";
import { INVENTORY_MOVEMENT_TYPES } from "@/src/lib/inventoryAdmin";
import { ADMIN_TONES, getAdminFeedbackTone, getSignedMoneyTone } from "@/src/lib/adminUi";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";

const INVENTORY_MANUAL_MOVEMENT_TYPES = INVENTORY_MOVEMENT_TYPES.filter(
  (movementType) => movementType === "usage" || movementType === "adjustment_out",
);

type InventoryPositionRow = {
  inventory_item_id: string;
  product_id: string | null;
  code: string;
  name: string;
  item_kind: string;
  unit: string;
  product_type: string | null;
  size_label: string | null;
  default_unit_cost: number | null;
  is_active: boolean;
  qty_on_hand: number | null;
  stock_value_amount: number | null;
  estimated_unit_value: number | null;
};

type InventorySummaryRow = {
  items_in_stock_count: number | null;
  total_units_on_hand: number | null;
  stock_on_hand_value_amount: number | null;
  total_inventory_purchase_amount: number | null;
  total_inventory_released_amount: number | null;
};

type InventoryMovementRow = {
  id: string;
  movement_type: string;
  movement_date: string;
  qty_delta: number;
  value_delta: number;
  vendor: string | null;
  notes: string | null;
  inventory_items:
    | {
        name: string;
        item_kind: string;
        product_type: string | null;
        size_label: string | null;
        unit: string;
      }
    | Array<{
        name: string;
        item_kind: string;
        product_type: string | null;
        size_label: string | null;
        unit: string;
      }>
    | null;
};

const normalizeMovementItem = (
  value: InventoryMovementRow["inventory_items"],
) => {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
};

type CatalogueProductRow = {
  id: string;
  slug: string;
  product_type: string | null;
  sort_order: number | null;
  product_translations: Array<{
    lang: string | null;
    title: string | null;
  }> | null;
  product_variants: Array<{
    size_label: string | null;
    price: number | null;
  }> | null;
};

type StockProductOption = {
  key: string;
  label: string;
};

type PackagingCatalogRow = {
  id: string;
  code: string;
  name: string;
  item_kind: "packaging" | "gift";
  unit_cost: number | null;
  is_active: boolean;
};

const resolveAdminLocale = async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  return cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;
};

const formatMoney = (value: number | null | undefined) => `${value ?? 0} ₾`;

const formatSignedMoney = (value: number | null | undefined) => {
  const safeValue = value ?? 0;
  const sign = safeValue > 0 ? "+" : "";
  return `${sign}${safeValue} ₾`;
};

const formatSignedQuantity = (value: number | null | undefined, unit?: string | null) => {
  const safeValue = value ?? 0;
  const sign = safeValue > 0 ? "+" : "";
  return unit ? `${sign}${safeValue} ${unit}` : `${sign}${safeValue}`;
};

const formatDay = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
};

const buildInventoryTitle = ({
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

const pickCatalogueProductTitle = (
  product: CatalogueProductRow,
  locale: Locale,
  dict: Record<string, string>,
) => {
  const localizedName =
    locale === "ka"
      ? product.product_translations?.find((entry) => entry.lang === "ka")?.title?.trim()
        ?? product.product_translations?.find((entry) => entry.lang === "en")?.title?.trim()
        ?? product.slug
      : product.product_translations?.find((entry) => entry.lang === "en")?.title?.trim()
        ?? product.product_translations?.find((entry) => entry.lang === "ka")?.title?.trim()
        ?? product.slug;

  return buildInventoryTitle({
    productType: product.product_type,
    name: localizedName,
    dict,
  });
};

const buildStockProductOptions = (
  products: CatalogueProductRow[],
  locale: Locale,
  dict: Record<string, string>,
) => {
  const options: StockProductOption[] = [];

  for (const product of products) {
    const baseLabel = pickCatalogueProductTitle(product, locale, dict);
    const uniqueSizeLabels = Array.from(new Set(
      (product.product_variants ?? [])
        .map((variant) => variant.size_label?.trim() ?? "")
        .filter((value) => value.length > 0),
    ));

    if (uniqueSizeLabels.length === 0) {
      options.push({
        key: `${product.id}::`,
        label: baseLabel,
      });
      continue;
    }

    for (const sizeLabel of uniqueSizeLabels) {
      options.push({
        key: `${product.id}::${encodeURIComponent(sizeLabel)}`,
        label: `${baseLabel} · ${sizeLabel}`,
      });
    }
  }

  return options.sort((left, right) => left.label.localeCompare(right.label, locale));
};

const buildSellPriceLookup = (products: CatalogueProductRow[]) => {
  const lookup = new Map<string, number>();

  for (const product of products) {
    for (const variant of product.product_variants ?? []) {
      if (typeof variant.price !== "number") {
        continue;
      }

      const sizeKey = (variant.size_label ?? "").trim().toLowerCase();
      lookup.set(`${product.id}::${sizeKey}`, variant.price);
    }
  }

  return lookup;
};

const buildPackagingStockOptions = (
  items: PackagingCatalogRow[],
  dict: Record<string, string>,
) =>
  items
    .filter((item) => item.is_active)
    .map((item) => ({
      id: item.id,
      label: `${item.name} · ${t(dict, `admin.inventory.kind.${item.item_kind}`)}`,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
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
  const resultCode = (params.result ?? "").trim();
  const resultMessage =
    resultCode === "inventory_stock_added"
      ? t(dict, "admin.inventory.result.stockAdded")
      : resultCode === "inventory_movement_created"
        ? t(dict, "admin.inventory.result.movementCreated")
        : resultCode === "invalid_inventory_item"
          ? t(dict, "admin.inventory.result.invalidItem")
          : resultCode === "invalid_inventory_movement"
            ? t(dict, "admin.inventory.result.invalidMovement")
            : resultCode === "insufficient_inventory"
              ? t(dict, "admin.inventory.result.insufficientInventory")
              : resultCode === "unauthorized"
                ? t(dict, "admin.inventory.result.unauthorized")
                : resultCode === "temporary_error"
                  ? t(dict, "admin.inventory.result.temporaryError")
                  : null;
  const resultTone =
    resultCode === "inventory_stock_added" || resultCode === "inventory_movement_created"
      ? ADMIN_TONES[getAdminFeedbackTone(true)]
      : resultCode
        ? ADMIN_TONES[getAdminFeedbackTone(false)]
        : null;

  const supabase = getSupabaseAdmin();
  const [
    { data: positionsData, error: positionsError },
    { data: summaryData, error: summaryError },
    { data: movementsData, error: movementsError },
    { data: catalogueProductsData, error: catalogueProductsError },
    { data: packagingCatalogData, error: packagingCatalogError },
  ] =
    await Promise.all([
      supabase
        .from("reporting_inventory_position_v1")
        .select(
          "inventory_item_id, product_id, code, name, item_kind, unit, product_type, size_label, default_unit_cost, is_active, qty_on_hand, stock_value_amount, estimated_unit_value",
        )
        .order("qty_on_hand", { ascending: false })
        .order("name", { ascending: true }),
      supabase
        .from("reporting_inventory_summary_v1")
        .select(
          "items_in_stock_count, total_units_on_hand, stock_on_hand_value_amount, total_inventory_purchase_amount, total_inventory_released_amount",
        )
        .maybeSingle(),
      supabase
        .from("inventory_movements")
        .select(
          "id, movement_type, movement_date, qty_delta, value_delta, vendor, notes, inventory_items(name, item_kind, product_type, size_label, unit)",
        )
        .order("movement_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("products")
        .select("id, slug, product_type, sort_order, product_translations(lang, title), product_variants(size_label, price)")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("packaging_catalog")
        .select("id, code, name, item_kind, unit_cost, is_active")
        .order("item_kind", { ascending: true })
        .order("name", { ascending: true }),
    ]);

  if (positionsError) {
    throw new Error(`[admin.inventory] Failed to fetch inventory positions: ${positionsError.message}`);
  }
  if (summaryError) {
    throw new Error(`[admin.inventory] Failed to fetch inventory summary: ${summaryError.message}`);
  }
  if (movementsError) {
    throw new Error(`[admin.inventory] Failed to fetch inventory movements: ${movementsError.message}`);
  }
  if (catalogueProductsError) {
    throw new Error(`[admin.inventory] Failed to fetch catalogue products: ${catalogueProductsError.message}`);
  }
  if (packagingCatalogError) {
    throw new Error(`[admin.inventory] Failed to fetch packaging catalog: ${packagingCatalogError.message}`);
  }

  const inventoryPositions = (positionsData ?? []) as InventoryPositionRow[];
  const inventorySummary = (summaryData ?? {
    items_in_stock_count: 0,
    total_units_on_hand: 0,
    stock_on_hand_value_amount: 0,
    total_inventory_purchase_amount: 0,
    total_inventory_released_amount: 0,
  }) as InventorySummaryRow;
  const inventoryMovements = (movementsData ?? []) as InventoryMovementRow[];
  const catalogueProducts = (catalogueProductsData ?? []) as CatalogueProductRow[];
  const packagingCatalogItems = (packagingCatalogData ?? []) as PackagingCatalogRow[];
  const stockProductOptions = buildStockProductOptions(catalogueProducts, locale, dict);
  const packagingStockOptions = buildPackagingStockOptions(packagingCatalogItems, dict);
  const sellPriceLookup = buildSellPriceLookup(catalogueProducts);
  const stockSellValueAmount = inventoryPositions.reduce((sum, item) => {
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
  const activeInventoryItems = inventoryPositions.filter((item) => item.is_active);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <Link href="/admin/dashboard" className="ui-button-secondary inline-flex w-fit items-center gap-2 whitespace-nowrap">
              <span aria-hidden="true">&larr;</span>
              <span>{t(dict, "admin.inventory.backToDashboard")}</span>
            </Link>
            <p className="ui-overline">{t(dict, "admin.inventory.kicker")}</p>
            <h1 className="font-display text-[2rem] leading-tight text-[color:var(--text-strong)]">
              {t(dict, "admin.inventory.title")}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-[color:var(--text-body)]">
              {t(dict, "admin.inventory.body")}
            </p>
          </div>
        </div>

        {resultMessage && resultTone ? (
          <div className={`ui-card border px-5 py-4 sm:px-6 ${resultTone.surface}`}>
            <p className={`text-sm leading-6 ${resultTone.text}`}>{resultMessage}</p>
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className={`rounded-[1.2rem] border px-4 py-4 ${ADMIN_TONES.info.surface}`}>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
              {t(dict, "admin.inventory.summary.itemsInStock")}
            </p>
            <p className={`mt-2 text-[1.2rem] font-semibold ${ADMIN_TONES.info.text}`}>
              {inventorySummary.items_in_stock_count ?? 0}
            </p>
          </div>
          <div className={`rounded-[1.2rem] border px-4 py-4 ${ADMIN_TONES.neutral.surface}`}>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
              {t(dict, "admin.inventory.summary.unitsOnHand")}
            </p>
            <p className={`mt-2 text-[1.2rem] font-semibold ${ADMIN_TONES.neutral.text}`}>
              {inventorySummary.total_units_on_hand ?? 0}
            </p>
          </div>
          <div className={`rounded-[1.2rem] border px-4 py-4 ${ADMIN_TONES.warning.surface}`}>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
              {t(dict, "admin.inventory.summary.stockValue")}
            </p>
            <p className={`mt-2 text-[1.2rem] font-semibold whitespace-nowrap ${ADMIN_TONES.warning.text}`}>
              {formatMoney(inventorySummary.stock_on_hand_value_amount)}
            </p>
          </div>
          <div className={`rounded-[1.2rem] border px-4 py-4 ${ADMIN_TONES.income.surface}`}>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
              {t(dict, "admin.inventory.summary.stockSellValue")}
            </p>
            <p className={`mt-2 text-[1.2rem] font-semibold whitespace-nowrap ${ADMIN_TONES.income.text}`}>
              {formatMoney(stockSellValueAmount)}
            </p>
          </div>
          <div className={`rounded-[1.2rem] border px-4 py-4 ${ADMIN_TONES.expense.surface}`}>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
              {t(dict, "admin.inventory.summary.totalPurchases")}
            </p>
            <p className={`mt-2 text-[1.2rem] font-semibold whitespace-nowrap ${ADMIN_TONES.expense.text}`}>
              {formatMoney(inventorySummary.total_inventory_purchase_amount)}
            </p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <section className={`ui-card border px-5 py-5 sm:px-6 sm:py-6 ${ADMIN_TONES.info.surface}`}>
            <div className="space-y-4">
              <div>
                <h2 className="ui-overline">{t(dict, "admin.inventory.itemFormTitle")}</h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-body)]">
                  {t(dict, "admin.inventory.itemFormBody")}
                </p>
              </div>
              <form action="/api/admin/inventory/items" method="post" className="space-y-4">
                <input type="hidden" name="returnTo" value="/admin/inventory" />
                <input type="hidden" name="stockSourceType" value="product" />
                <div className="space-y-1.5">
                  <label htmlFor="inventory-stock-product" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                    {t(dict, "admin.inventory.itemForm.stockProduct")}
                  </label>
                  <select
                    id="inventory-stock-product"
                    name="stockProductKey"
                    defaultValue=""
                    className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                  >
                    <option value="">{t(dict, "admin.inventory.itemForm.stockProductEmpty")}</option>
                    {stockProductOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="inventory-item-date" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.inventory.itemForm.date")}
                    </label>
                    <input
                      id="inventory-item-date"
                      name="movementDate"
                      type="date"
                      defaultValue={today}
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="inventory-item-qty" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.inventory.itemForm.qty")}
                    </label>
                    <input
                      id="inventory-item-qty"
                      name="qty"
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="inventory-item-vendor" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.inventory.itemForm.vendor")}
                    </label>
                    <input
                      id="inventory-item-vendor"
                      name="vendor"
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="inventory-item-notes" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                    {t(dict, "admin.inventory.itemForm.notes")}
                  </label>
                  <input
                    id="inventory-item-notes"
                    name="notes"
                    className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                  />
                </div>

                <button type="submit" className="ui-button-secondary whitespace-nowrap">
                  {t(dict, "admin.inventory.itemForm.submit")}
                </button>
              </form>
            </div>
          </section>

          <section className={`ui-card border px-5 py-5 sm:px-6 sm:py-6 ${ADMIN_TONES.warning.surface}`}>
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="ui-overline">{t(dict, "admin.inventory.packagingFormTitle")}</h2>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-body)]">
                    {t(dict, "admin.inventory.packagingFormBody")}
                  </p>
                </div>
                <Link href="/admin/fulfillment" className="ui-button-secondary whitespace-nowrap">
                  {t(dict, "admin.inventory.packagingForm.manageCatalog")}
                </Link>
              </div>
              <form action="/api/admin/inventory/items" method="post" className="space-y-4">
                <input type="hidden" name="returnTo" value="/admin/inventory" />
                <input type="hidden" name="stockSourceType" value="packaging" />
                <div className="space-y-1.5">
                  <label htmlFor="inventory-packaging-item" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                    {t(dict, "admin.inventory.packagingForm.item")}
                  </label>
                  <select
                    id="inventory-packaging-item"
                    name="packagingCatalogId"
                    defaultValue=""
                    className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                  >
                    <option value="">{t(dict, "admin.inventory.packagingForm.itemEmpty")}</option>
                    {packagingStockOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="inventory-packaging-date" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.inventory.packagingForm.date")}
                    </label>
                    <input
                      id="inventory-packaging-date"
                      name="movementDate"
                      type="date"
                      defaultValue={today}
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="inventory-packaging-qty" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.inventory.packagingForm.qty")}
                    </label>
                    <input
                      id="inventory-packaging-qty"
                      name="qty"
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="inventory-packaging-total" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.inventory.packagingForm.totalPaid")}
                    </label>
                    <input
                      id="inventory-packaging-total"
                      name="totalPaid"
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="inventory-packaging-vendor" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.inventory.packagingForm.vendor")}
                    </label>
                    <input
                      id="inventory-packaging-vendor"
                      name="vendor"
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="inventory-packaging-notes" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                    {t(dict, "admin.inventory.packagingForm.notes")}
                  </label>
                  <input
                    id="inventory-packaging-notes"
                    name="notes"
                    className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                  />
                </div>

                <button type="submit" className="ui-button-secondary whitespace-nowrap">
                  {t(dict, "admin.inventory.packagingForm.submit")}
                </button>
              </form>
            </div>
          </section>
        </section>

        <section className="grid gap-6">
          <section className={`ui-card border px-5 py-5 sm:px-6 sm:py-6 ${ADMIN_TONES.warning.surface}`}>
            <div className="space-y-4">
              <div>
                <h2 className="ui-overline">{t(dict, "admin.inventory.movementFormTitle")}</h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-body)]">
                  {t(dict, "admin.inventory.movementFormBody")}
                </p>
              </div>
              <form action="/api/admin/inventory/movements" method="post" className="space-y-4">
                <input type="hidden" name="returnTo" value="/admin/inventory" />

                <div className="space-y-1.5">
                  <label htmlFor="inventory-movement-item" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                    {t(dict, "admin.inventory.movementForm.item")}
                  </label>
                  <select
                    id="inventory-movement-item"
                    name="inventoryItemId"
                    className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    defaultValue=""
                  >
                    <option value="">{t(dict, "admin.inventory.movementForm.itemEmpty")}</option>
                    {activeInventoryItems.map((item) => (
                      <option key={item.inventory_item_id} value={item.inventory_item_id}>
                        {buildInventoryTitle({
                          productType: item.product_type,
                          name: item.name,
                          dict,
                        })}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="inventory-movement-type" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.inventory.movementForm.type")}
                    </label>
                    <select
                      id="inventory-movement-type"
                      name="movementType"
                      defaultValue="usage"
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    >
                      {INVENTORY_MANUAL_MOVEMENT_TYPES.map((movementType) => (
                        <option key={movementType} value={movementType}>
                          {t(dict, `admin.inventory.movements.type.${movementType}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="inventory-movement-date" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.inventory.movementForm.date")}
                    </label>
                    <input
                      id="inventory-movement-date"
                      name="movementDate"
                      type="date"
                      defaultValue={today}
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="inventory-qty" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                    {t(dict, "admin.inventory.movementForm.qty")}
                  </label>
                  <input
                    id="inventory-qty"
                    name="qty"
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="inventory-movement-notes" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                    {t(dict, "admin.inventory.movementForm.notes")}
                  </label>
                  <input
                    id="inventory-movement-notes"
                    name="notes"
                    className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                  />
                </div>

                <button type="submit" className="ui-button-secondary whitespace-nowrap">
                  {t(dict, "admin.inventory.movementForm.submit")}
                </button>
              </form>
            </div>
          </section>
        </section>

        <section className="space-y-6">
          <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-4">
              <div>
                <h2 className="ui-overline">{t(dict, "admin.inventory.positionsTitle")}</h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-body)]">
                  {t(dict, "admin.inventory.positionsBody")}
                </p>
              </div>
              {inventoryPositions.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {inventoryPositions.map((item) => {
                    const stockTone = ADMIN_TONES[getSignedMoneyTone(item.stock_value_amount)];
                    return (
                      <div key={item.inventory_item_id} className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="min-w-0 text-sm font-medium leading-5 text-[color:var(--text-strong)]">
                              {buildInventoryTitle({
                                productType: item.product_type,
                                name: item.name,
                                dict,
                              })}
                            </p>
                            <p className={`whitespace-nowrap text-sm font-medium ${stockTone.text}`}>
                              {formatMoney(item.stock_value_amount)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5 text-[11px] leading-4 text-[color:var(--text-muted)]">
                            <span className="rounded-full border border-[var(--border-soft)] px-2.5 py-1">
                              {t(dict, "admin.inventory.positions.kind")}: {t(dict, `admin.inventory.kind.${item.item_kind}`)}
                            </span>
                            <span className="rounded-full border border-[var(--border-soft)] px-2.5 py-1">
                              {t(dict, "admin.inventory.positions.qtyOnHand")}: {item.qty_on_hand ?? 0} {item.unit}
                            </span>
                            {item.size_label ? (
                              <span className="rounded-full border border-[var(--border-soft)] px-2.5 py-1">
                                {t(dict, "admin.inventory.itemForm.size")}: {item.size_label}
                              </span>
                            ) : null}
                            <span className="rounded-full border border-[var(--border-soft)] px-2.5 py-1">
                              {t(dict, "admin.inventory.positions.unitValue")}: {formatMoney(item.estimated_unit_value)}
                            </span>
                          </div>
                          {item.code ? (
                            <p className="text-[11px] leading-4 text-[color:var(--text-muted)]">
                              {t(dict, "admin.inventory.itemForm.code")}: {item.code}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                  {t(dict, "admin.inventory.positions.empty")}
                </p>
              )}
            </div>
          </section>

          <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-4">
              <div>
                <h2 className="ui-overline">{t(dict, "admin.inventory.movementsTitle")}</h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-body)]">
                  {t(dict, "admin.inventory.movementsBody")}
                </p>
              </div>
              {inventoryMovements.length > 0 ? (
                <div className="space-y-3">
                    {inventoryMovements.map((movement) => {
                      const tone = ADMIN_TONES[getSignedMoneyTone(movement.value_delta)];
                      const item = normalizeMovementItem(movement.inventory_items);
                      const itemTitle = item
                        ? buildInventoryTitle({
                            productType: item.product_type,
                            name: item.name,
                            dict,
                        })
                      : t(dict, "admin.inventory.missingItem");

                    return (
                      <div key={movement.id} className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <p className="font-medium text-[color:var(--text-strong)]">{itemTitle}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm leading-6 text-[color:var(--text-muted)]">
                              <span>{formatDay(movement.movement_date)}</span>
                              <span>{t(dict, `admin.inventory.movements.type.${movement.movement_type}`)}</span>
                              <span>{t(dict, "admin.inventory.movements.qty")}: {formatSignedQuantity(movement.qty_delta, item?.unit)}</span>
                              {movement.vendor ? <span>{movement.vendor}</span> : null}
                            </div>
                            {movement.notes ? (
                              <p className="text-sm leading-6 text-[color:var(--text-body)]">{movement.notes}</p>
                            ) : null}
                          </div>
                          <p className={`text-sm font-medium whitespace-nowrap ${tone.text}`}>
                            {t(dict, "admin.inventory.movements.value")}: {formatSignedMoney(movement.value_delta)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[color:var(--text-muted)]">
                  {t(dict, "admin.inventory.movements.empty")}
                </p>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
