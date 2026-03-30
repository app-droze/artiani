import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/src/i18n/locales";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export default async function CheckoutPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) {
    notFound();
  }
  redirect(`/${lang}/cart`);
}
