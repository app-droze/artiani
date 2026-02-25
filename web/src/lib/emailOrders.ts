import "server-only";

import nodemailer from "nodemailer";
import { envMail, publicBaseUrl } from "@/src/lib/env.server";
import type { PricedLineItem } from "@/src/lib/orderPricing";
import { getPaymentInstructions } from "@/src/lib/paymentInstructions";
import type { Locale } from "@/src/i18n/locales";

type OrderEmailPayload = {
  order: {
    code: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_note: string | null;
    subtotal_cents: number;
    total_cents: number;
  };
  items: PricedLineItem[];
  lang: Locale;
};

const formatMoneyCents = (value: number) => `${(value / 100).toFixed(2)} GEL`;

type EmailCopy = {
  customerSubject: (code: string) => string;
  customerGreeting: string;
  customerTitle: string;
  orderCodeLabel: string;
  trackInstruction: string;
  trackButtonLabel: string;
  orderSummaryLabel: string;
  totalLabel: string;
  adminSubject: (code: string) => string;
  adminTitle: string;
  customerNameLabel: string;
  customerEmailLabel: string;
  customerPhoneLabel: string;
  languageLabel: string;
  subtotalLabel: string;
  noteLabel: string;
  itemsLabel: string;
  kindLabels: Record<PricedLineItem["product_kind"], string>;
  optionSignature: string;
  optionAddText: string;
  optionCardPostcard: string;
  optionCardGreeting: string;
};

const EMAIL_COPY: Record<Locale, EmailCopy> = {
  en: {
    customerSubject: (code) => `Artiani order ${code}`,
    customerGreeting: "Hello",
    customerTitle: "Order confirmation",
    orderCodeLabel: "Order code",
    trackInstruction: "Track using code + your email:",
    trackButtonLabel: "Track order",
    orderSummaryLabel: "Order summary",
    totalLabel: "Total",
    adminSubject: (code) => `New Artiani order ${code}`,
    adminTitle: "New order",
    customerNameLabel: "Customer",
    customerEmailLabel: "Email",
    customerPhoneLabel: "Phone",
    languageLabel: "Language",
    subtotalLabel: "Subtotal",
    noteLabel: "Note",
    itemsLabel: "Items",
    kindLabels: {
      cards: "cards",
      bookmarks: "bookmarks",
      calendars: "calendar",
      paintings: "painting",
      prints: "print",
    },
    optionSignature: "signed",
    optionAddText: "custom text",
    optionCardPostcard: "postcard back",
    optionCardGreeting: "greeting card back",
  },
  ka: {
    customerSubject: (code) => `Artiani შეკვეთა ${code}`,
    customerGreeting: "გამარჯობა",
    customerTitle: "შეკვეთის დადასტურება",
    orderCodeLabel: "შეკვეთის კოდი",
    trackInstruction: "სტატუსის სანახავად გამოიყენეთ კოდი და ელფოსტა:",
    trackButtonLabel: "შეკვეთის ნახვა",
    orderSummaryLabel: "შეკვეთის შეჯამება",
    totalLabel: "ჯამი",
    adminSubject: (code) => `ახალი შეკვეთა ${code}`,
    adminTitle: "ახალი შეკვეთა",
    customerNameLabel: "კლიენტი",
    customerEmailLabel: "ელფოსტა",
    customerPhoneLabel: "ტელეფონი",
    languageLabel: "ენა",
    subtotalLabel: "ქვეჯამი",
    noteLabel: "შენიშვნა",
    itemsLabel: "ნივთები",
    kindLabels: {
      cards: "ბარათები",
      bookmarks: "სანიშნეები",
      calendars: "კალენდარი",
      paintings: "ნახატი",
      prints: "პრინტი",
    },
    optionSignature: "ხელმოწერილი",
    optionAddText: "პერსონალიზებული ტექსტით",
    optionCardPostcard: "ფორმატი: საფოსტო ბარათი",
    optionCardGreeting: "ფორმატი: მისალოცი ბარათი",
  },
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const pickItemTitle = (item: PricedLineItem, lang: Locale) =>
  lang === "ka" ? item.title_ka : item.title_en;

const describeItem = (item: PricedLineItem, copy: EmailCopy) => {
  const details: string[] = [copy.kindLabels[item.product_kind]];

  if (item.options.signature) {
    details.push(copy.optionSignature);
  }
  if (item.options.add_text) {
    details.push(copy.optionAddText);
  }
  if (item.options.card_back === "postcard") {
    details.push(copy.optionCardPostcard);
  }
  if (item.options.card_back === "greeting") {
    details.push(copy.optionCardGreeting);
  }

  return details.join(", ");
};

const buildItemsHtml = (items: PricedLineItem[], lang: Locale, copy: EmailCopy) =>
  items
    .map(
      (item) =>
        `<li><strong>${escapeHtml(pickItemTitle(item, lang))}</strong> (${escapeHtml(describeItem(item, copy))}) × ${item.qty} — ${formatMoneyCents(item.line_total_cents)}</li>`,
    )
    .join("");

const buildItemsText = (items: PricedLineItem[], lang: Locale, copy: EmailCopy) =>
  items
    .map(
      (item) =>
        `- ${pickItemTitle(item, lang)} (${describeItem(item, copy)}) x ${item.qty} — ${formatMoneyCents(item.line_total_cents)}`,
    )
    .join("\n");

export const sendOrderEmails = async ({ order, items, lang }: OrderEmailPayload) => {
  if (!envMail) {
    return { emailSent: false as const };
  }

  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: envMail.GMAIL_USER,
      pass: envMail.GMAIL_APP_PASSWORD,
    },
  });

  try {
    const copy = EMAIL_COPY[lang];
    const trackUrl = `${publicBaseUrl}/${lang}/track`;
    const itemsHtml = buildItemsHtml(items, lang, copy);
    const itemsText = buildItemsText(items, lang, copy);
    const paymentInstructions = getPaymentInstructions(lang, order.code);

    const customerSubject = copy.customerSubject(order.code);
    const customerHtml = `
      <h2>${copy.customerTitle}</h2>
      <p>${copy.customerGreeting} ${escapeHtml(order.customer_name)},</p>
      <p><strong>${copy.orderCodeLabel}:</strong> ${escapeHtml(order.code)}</p>
      <p>${copy.trackInstruction}</p>
      <p>
        <a href="${trackUrl}" style="display:inline-block;padding:10px 16px;border:1px solid #111;border-radius:999px;text-decoration:none;color:#111;">
          ${copy.trackButtonLabel}
        </a>
      </p>
      <p>${copy.orderSummaryLabel}:</p>
      <ul>${itemsHtml}</ul>
      <p>${copy.totalLabel}: <strong>${formatMoneyCents(order.total_cents)}</strong></p>
      ${paymentInstructions.html}
    `;
    const customerText = [
      `${copy.customerGreeting} ${order.customer_name},`,
      "",
      `${copy.customerTitle}`,
      "",
      `${copy.orderCodeLabel}: ${order.code}`,
      `${copy.trackInstruction} ${trackUrl}`,
      "",
      `${copy.orderSummaryLabel}:`,
      itemsText,
      "",
      `${copy.totalLabel}: ${formatMoneyCents(order.total_cents)}`,
      "",
      paymentInstructions.text,
    ].join("\n");

    const adminSubject = copy.adminSubject(order.code);
    const adminHtml = `
      <h2>${copy.adminTitle}</h2>
      <p><strong>${escapeHtml(order.code)}</strong></p>
      <p>${copy.customerNameLabel}: ${escapeHtml(order.customer_name)}</p>
      <p>${copy.customerEmailLabel}: ${escapeHtml(order.customer_email)}</p>
      <p>${copy.customerPhoneLabel}: ${escapeHtml(order.customer_phone)}</p>
      <p>${copy.languageLabel}: ${escapeHtml(lang)}</p>
      <p>${copy.subtotalLabel}: ${formatMoneyCents(order.subtotal_cents)}</p>
      <p>${copy.totalLabel}: <strong>${formatMoneyCents(order.total_cents)}</strong></p>
      <p>${copy.noteLabel}: ${escapeHtml(order.customer_note ?? "-")}</p>
      <p>${copy.itemsLabel}:</p>
      <ul>${itemsHtml}</ul>
      <p>${copy.trackButtonLabel}: <a href="${trackUrl}">${trackUrl}</a></p>
    `;
    const adminText = [
      `${copy.adminTitle} ${order.code}`,
      `${copy.customerNameLabel}: ${order.customer_name}`,
      `${copy.customerEmailLabel}: ${order.customer_email}`,
      `${copy.customerPhoneLabel}: ${order.customer_phone}`,
      `${copy.languageLabel}: ${lang}`,
      `${copy.subtotalLabel}: ${formatMoneyCents(order.subtotal_cents)}`,
      `${copy.totalLabel}: ${formatMoneyCents(order.total_cents)}`,
      `${copy.noteLabel}: ${order.customer_note ?? "-"}`,
      "",
      `${copy.itemsLabel}:`,
      itemsText,
      "",
      `${copy.trackButtonLabel}: ${trackUrl}`,
    ].join("\n");

    await Promise.all([
      transport.sendMail({
        from: envMail.ORDERS_FROM_EMAIL,
        to: order.customer_email,
        subject: customerSubject,
        html: customerHtml,
        text: customerText,
      }),
      transport.sendMail({
        from: envMail.ORDERS_FROM_EMAIL,
        to: envMail.ORDERS_ADMIN_EMAIL,
        subject: adminSubject,
        html: adminHtml,
        text: adminText,
      }),
    ]);

    return { emailSent: true as const };
  } catch (error) {
    console.error("SMTP email send failed", error);
    return { emailSent: false as const };
  }
};
