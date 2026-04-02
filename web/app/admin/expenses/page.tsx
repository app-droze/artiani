import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import { ADMIN_EXPENSE_CATEGORY_OPTIONS } from "@/src/lib/adminFormOptions";
import { normalizeAdminExpenseCategory, normalizeAdminExpenseCategoryKey } from "@/src/lib/adminExpenseCategory";
import { defaultLocale, isLocale, type Locale } from "@/src/i18n/locales";
import { getAdminSessionCookieName, verifyAdminSessionToken } from "@/src/lib/adminSession";
import { ADMIN_TONES, getAdminFeedbackTone, getSignedMoneyTone } from "@/src/lib/adminUi";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";

type BusinessExpenseRow = {
  id: string;
  incurred_on: string;
  expense_category: string;
  description: string;
  amount: number | null;
  vendor: string | null;
  notes: string | null;
};

const resolveAdminLocale = async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  return cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;
};

const formatMoney = (value: number | null | undefined) => `${value ?? 0} ₾`;

const formatDay = (value: string, locale: Locale) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "ka" ? "ka-GE" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

export default async function AdminExpensesPage({
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
    resultCode === "expense_added"
      ? t(dict, "admin.reports.expenses.result.added")
      : resultCode === "invalid_expense"
        ? t(dict, "admin.reports.expenses.result.invalid")
        : resultCode === "unauthorized"
          ? t(dict, "admin.reports.expenses.result.unauthorized")
          : resultCode === "temporary_error"
            ? t(dict, "admin.reports.expenses.result.temporaryError")
            : null;
  const resultTone =
    resultCode === "expense_added"
      ? ADMIN_TONES[getAdminFeedbackTone(true)]
      : resultCode
        ? ADMIN_TONES[getAdminFeedbackTone(false)]
        : null;

  const { data, error } = await getSupabaseAdmin()
    .from("business_expenses")
    .select("id, incurred_on, expense_category, description, amount, vendor, notes")
    .order("incurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`[admin.expenses] Failed to fetch business expenses: ${error.message}`);
  }

  const businessExpenses = (data ?? []) as BusinessExpenseRow[];
  const thirtyDayStart = new Date();
  thirtyDayStart.setDate(thirtyDayStart.getDate() - 30);
  const totalExpensesAmount = businessExpenses.reduce((sum, expense) => sum + (expense.amount ?? 0), 0);
  const last30DaysAmount = businessExpenses.reduce((sum, expense) => {
    const incurredOn = new Date(expense.incurred_on);
    if (Number.isNaN(incurredOn.getTime()) || incurredOn < thirtyDayStart) {
      return sum;
    }

    return sum + (expense.amount ?? 0);
  }, 0);
  const adsAmount = businessExpenses.reduce((sum, expense) => (
    normalizeAdminExpenseCategoryKey(expense.expense_category) === "ads"
      ? sum + (expense.amount ?? 0)
      : sum
  ), 0);
  const infrastructureAmount = businessExpenses.reduce((sum, expense) => (
    normalizeAdminExpenseCategoryKey(expense.expense_category) === "infrastructure"
      ? sum + (expense.amount ?? 0)
      : sum
  ), 0);
  const totalExpensesTone = ADMIN_TONES[getSignedMoneyTone(-totalExpensesAmount)];
  const last30DaysTone = ADMIN_TONES[getSignedMoneyTone(-last30DaysAmount)];
  const adsTone = ADMIN_TONES[getSignedMoneyTone(-adsAmount)];
  const infrastructureTone = ADMIN_TONES[getSignedMoneyTone(-infrastructureAmount)];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Link href="/admin/dashboard" className="ui-button-secondary inline-flex w-fit items-center gap-2 whitespace-nowrap">
              <span aria-hidden="true">&larr;</span>
              <span>{t(dict, "admin.expenses.backToDashboard")}</span>
            </Link>
            <p className="ui-overline">{t(dict, "admin.expenses.kicker")}</p>
            <h1 className="font-display text-[2rem] leading-tight text-[color:var(--text-strong)]">
              {t(dict, "admin.expenses.title")}
            </h1>
          </div>
        </div>

        {resultMessage && resultTone ? (
          <div className={`ui-card border px-5 py-4 sm:px-6 ${resultTone.surface}`}>
            <p className={`text-sm leading-6 ${resultTone.text}`}>{resultMessage}</p>
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className={`rounded-[1.1rem] border px-4 py-4 ${totalExpensesTone.surface}`}>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
              {t(dict, "admin.expenses.summary.total")}
            </p>
            <p className={`mt-2 whitespace-nowrap text-[1.15rem] font-semibold ${totalExpensesTone.text}`}>
              {formatMoney(totalExpensesAmount)}
            </p>
          </div>
          <div className={`rounded-[1.1rem] border px-4 py-4 ${last30DaysTone.surface}`}>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
              {t(dict, "admin.expenses.summary.last30Days")}
            </p>
            <p className={`mt-2 whitespace-nowrap text-[1.15rem] font-semibold ${last30DaysTone.text}`}>
              {formatMoney(last30DaysAmount)}
            </p>
          </div>
          <div className={`rounded-[1.1rem] border px-4 py-4 ${adsTone.surface}`}>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
              {t(dict, "admin.expenses.summary.ads")}
            </p>
            <p className={`mt-2 whitespace-nowrap text-[1.15rem] font-semibold ${adsTone.text}`}>
              {formatMoney(adsAmount)}
            </p>
          </div>
          <div className={`rounded-[1.1rem] border px-4 py-4 ${infrastructureTone.surface}`}>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
              {t(dict, "admin.expenses.summary.infrastructure")}
            </p>
            <p className={`mt-2 whitespace-nowrap text-[1.15rem] font-semibold ${infrastructureTone.text}`}>
              {formatMoney(infrastructureAmount)}
            </p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)]">
          <section className={`ui-card border px-5 py-5 sm:px-6 sm:py-6 ${ADMIN_TONES.expense.surface}`}>
            <div className="space-y-4">
              <div>
                <h2 className="ui-overline">{t(dict, "admin.reports.expenses.title")}</h2>
              </div>
              <form action="/api/admin/expenses" method="post" className="space-y-4">
                <input type="hidden" name="returnTo" value="/admin/expenses" />
                <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                  <div className="space-y-1.5">
                    <label htmlFor="expense-date" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.reports.expenses.form.incurredOn")}
                    </label>
                    <input
                      id="expense-date"
                      name="incurredOn"
                      type="date"
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="expense-category" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.reports.expenses.form.category")}
                    </label>
                    <select
                      id="expense-category"
                      name="expenseCategory"
                      defaultValue=""
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    >
                      <option value="">{t(dict, "admin.reports.expenses.form.categoryEmpty")}</option>
                      {ADMIN_EXPENSE_CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>
                          {t(dict, `admin.options.expenseCategory.${category}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="expense-description" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                    {t(dict, "admin.reports.expenses.form.description")}
                  </label>
                  <input
                    id="expense-description"
                    name="description"
                    className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                  <div className="space-y-1.5">
                    <label htmlFor="expense-amount" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.reports.expenses.form.amount")}
                    </label>
                    <input
                      id="expense-amount"
                      name="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="expense-vendor" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                      {t(dict, "admin.reports.expenses.form.vendor")}
                    </label>
                    <input
                      id="expense-vendor"
                      name="vendor"
                      className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="expense-notes" className="text-[13px] leading-6 text-[color:var(--text-muted)]">
                    {t(dict, "admin.reports.expenses.form.notes")}
                  </label>
                  <input
                    id="expense-notes"
                    name="notes"
                    className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
                  />
                </div>

                <button type="submit" className="ui-button-secondary whitespace-nowrap">
                  {t(dict, "admin.reports.expenses.form.submit")}
                </button>
              </form>
            </div>
          </section>

          <section className="ui-card border border-[var(--border-soft)] px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-4">
              <div>
                <h2 className="ui-overline">{t(dict, "admin.expenses.recentTitle")}</h2>
              </div>
              {businessExpenses.length > 0 ? (
                <div className="space-y-3">
                  {businessExpenses.map((expense) => (
                    <div key={expense.id} className="rounded-[1rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-[color:var(--text-strong)]">{expense.description}</p>
                            <p className="text-sm leading-6 text-[color:var(--text-muted)]">{normalizeAdminExpenseCategory(expense.expense_category, locale, dict)}</p>
                          </div>
                          <p className={`text-sm font-medium ${ADMIN_TONES.expense.text}`}>{formatMoney(expense.amount)}</p>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm leading-6 text-[color:var(--text-muted)]">
                          <span>{formatDay(expense.incurred_on, locale)}</span>
                          {expense.vendor ? <span>{expense.vendor}</span> : null}
                        </div>
                        {expense.notes ? (
                          <p className="text-sm leading-6 text-[color:var(--text-body)]">{expense.notes}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[color:var(--text-muted)]">{t(dict, "admin.reports.expenses.empty")}</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
