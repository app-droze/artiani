import { cookies } from "next/headers";
import { defaultLocale, isLocale } from "@/src/i18n/locales";
import "./globals.css";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("NEXT_LOCALE")?.value;
  const initialLang = cookieLang && isLocale(cookieLang) ? cookieLang : defaultLocale;

  return (
    <html lang={initialLang} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
