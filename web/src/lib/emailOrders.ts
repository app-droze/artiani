import "server-only";

import { Resend } from "resend";
import { envEmail } from "@/src/lib/env.server";
import type { PricedLineItem } from "@/src/lib/orderPricing";
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

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const buildItemsHtml = (items: PricedLineItem[]) =>
  items
    .map(
      (item) =>
        `<li>${escapeHtml(item.title_en)} × ${item.qty} — ${formatMoneyCents(item.line_total_cents)}</li>`,
    )
    .join("");

const buildItemsText = (items: PricedLineItem[]) =>
  items
    .map(
      (item) =>
        `- ${item.title_en} x ${item.qty} — ${formatMoneyCents(item.line_total_cents)}`,
    )
    .join("\n");

export const sendOrderEmails = async ({ order, items, lang }: OrderEmailPayload) => {
  if (!envEmail) {
    return { emailSent: false as const };
  }

  const resend = new Resend(envEmail.RESEND_API_KEY);
  const trackPath = `/${lang}/track`;
  const itemsHtml = buildItemsHtml(items);
  const itemsText = buildItemsText(items);

  const customerSubject = `Artiani order ${order.code}`;
  const customerHtml = `
    <p>Hello ${escapeHtml(order.customer_name)},</p>
    <p>Your order code is <strong>${escapeHtml(order.code)}</strong>.</p>
    <p>Track with code + your email: <a href="${trackPath}">${trackPath}</a></p>
    <p>Order summary:</p>
    <ul>${itemsHtml}</ul>
    <p>Total: <strong>${formatMoneyCents(order.total_cents)}</strong></p>
  `;
  const customerText = [
    `Hello ${order.customer_name},`,
    "",
    `Your order code is ${order.code}.`,
    `Track with code + your email: ${trackPath}`,
    "",
    "Order summary:",
    itemsText,
    "",
    `Total: ${formatMoneyCents(order.total_cents)}`,
  ].join("\n");

  const adminSubject = `New Artiani order ${order.code}`;
  const adminHtml = `
    <p>New order <strong>${escapeHtml(order.code)}</strong></p>
    <p>Customer: ${escapeHtml(order.customer_name)}</p>
    <p>Email: ${escapeHtml(order.customer_email)}</p>
    <p>Phone: ${escapeHtml(order.customer_phone)}</p>
    <p>Language: ${escapeHtml(lang)}</p>
    <p>Subtotal: ${formatMoneyCents(order.subtotal_cents)}</p>
    <p>Total: <strong>${formatMoneyCents(order.total_cents)}</strong></p>
    <p>Note: ${escapeHtml(order.customer_note ?? "-")}</p>
    <p>Items:</p>
    <ul>${itemsHtml}</ul>
  `;
  const adminText = [
    `New order ${order.code}`,
    `Customer: ${order.customer_name}`,
    `Email: ${order.customer_email}`,
    `Phone: ${order.customer_phone}`,
    `Language: ${lang}`,
    `Subtotal: ${formatMoneyCents(order.subtotal_cents)}`,
    `Total: ${formatMoneyCents(order.total_cents)}`,
    `Note: ${order.customer_note ?? "-"}`,
    "",
    "Items:",
    itemsText,
  ].join("\n");

  const [customerSend, adminSend] = await Promise.all([
    resend.emails.send({
      from: envEmail.ORDERS_FROM_EMAIL,
      to: [order.customer_email],
      subject: customerSubject,
      html: customerHtml,
      text: customerText,
    }),
    resend.emails.send({
      from: envEmail.ORDERS_FROM_EMAIL,
      to: [envEmail.ORDERS_ADMIN_EMAIL],
      subject: adminSubject,
      html: adminHtml,
      text: adminText,
    }),
  ]);

  if (customerSend.error) {
    throw new Error(customerSend.error.message ?? "Customer email send failed.");
  }
  if (adminSend.error) {
    throw new Error(adminSend.error.message ?? "Admin email send failed.");
  }

  return { emailSent: true as const };
};
