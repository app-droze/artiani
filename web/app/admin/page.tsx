import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import { defaultLocale, isLocale, type Locale } from "@/src/i18n/locales";
import {
  getAdminSessionCookieName,
  resolveSafeAdminRedirectPath,
  verifyAdminSessionToken,
} from "@/src/lib/adminSession";

const resolveAdminLocale = async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  return cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const [cookieStore, locale, params] = await Promise.all([
    cookies(),
    resolveAdminLocale(),
    searchParams,
  ]);
  const dict = await getDictionary(locale);
  const nextPath = resolveSafeAdminRedirectPath(params.next ?? null);
  const hasSession = await verifyAdminSessionToken(
    cookieStore.get(getAdminSessionCookieName())?.value,
  );

  if (hasSession) {
    redirect(nextPath);
  }

  const errorMessage =
    params.error === "invalid_password"
      ? t(dict, "admin.login.error.invalidPassword")
      : params.error === "rate_limited"
        ? t(dict, "admin.login.error.rateLimited")
      : params.error === "temporary_error"
        ? t(dict, "admin.login.error.temporary")
        : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-12 sm:px-6">
      <div className="ui-card mx-auto w-full max-w-md border border-[var(--border-soft)] px-6 py-7 sm:px-7 sm:py-8">
        <div className="space-y-2">
          <p className="ui-overline">{t(dict, "admin.login.kicker")}</p>
          <h1 className="font-display text-[2rem] leading-tight text-[color:var(--text-strong)]">
            {t(dict, "admin.login.title")}
          </h1>
          <p className="text-sm leading-7 text-[color:var(--text-body)]">
            {t(dict, "admin.login.body")}
          </p>
        </div>

        <form action="/api/admin/login" method="post" className="mt-6 space-y-4">
          <input type="hidden" name="next" value={nextPath} />
          <div className="space-y-1.5">
            <label
              htmlFor="admin-password"
              className="text-[13px] leading-6 text-[color:var(--text-muted)]"
            >
              {t(dict, "admin.login.passwordLabel")}
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-[1rem] border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text-strong)] outline-none transition-colors focus:border-black/20"
              required
            />
          </div>

          {errorMessage ? (
            <p className="text-sm leading-6 text-[#8a2f2f]">{errorMessage}</p>
          ) : null}

          <button type="submit" className="ui-button-primary w-full">
            {t(dict, "admin.login.submit")}
          </button>
        </form>
      </div>
    </main>
  );
}
