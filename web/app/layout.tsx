import { defaultLocale } from "@/src/i18n/locales";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={defaultLocale} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
