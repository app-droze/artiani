import "server-only";

import nodemailer from "nodemailer";
import { envMail, getPublicBaseUrl } from "@/src/lib/env.server";
import { getPaymentInstructions } from "@/src/lib/paymentInstructions";
import type { Locale } from "@/src/i18n/locales";

type BidEmailPayload = {
  bid: {
    code: string;
    product_slug: string;
    bidder_name: string;
    bidder_email: string;
    bidder_phone: string;
    bid_amount_cents: number;
    note: string | null;
  };
  lang: Locale;
};

type BidEmailCopy = {
  bidderSubject: (code: string) => string;
  bidderTitle: string;
  bidderGreeting: string;
  bidCodeLabel: string;
  paintingLabel: string;
  amountLabel: string;
  trackInstruction: string;
  trackButtonLabel: string;
  adminSubject: (code: string) => string;
  adminTitle: string;
  nameLabel: string;
  emailLabel: string;
  phoneLabel: string;
  noteLabel: string;
  languageLabel: string;
};

const COPY_BY_LANG: Record<Locale, BidEmailCopy> = {
  en: {
    bidderSubject: (code) => `Artiani bid ${code}`,
    bidderTitle: "Bid received",
    bidderGreeting: "Hello",
    bidCodeLabel: "Bid code",
    paintingLabel: "Painting",
    amountLabel: "Bid amount",
    trackInstruction: "Track using code + your email:",
    trackButtonLabel: "Track order",
    adminSubject: (code) => `New Artiani bid ${code}`,
    adminTitle: "New bid",
    nameLabel: "Bidder",
    emailLabel: "Email",
    phoneLabel: "Phone",
    noteLabel: "Note",
    languageLabel: "Language",
  },
  ka: {
    bidderSubject: (code) => `Artiani ფსონი ${code}`,
    bidderTitle: "ფსონი მიღებულია",
    bidderGreeting: "გამარჯობა",
    bidCodeLabel: "ფსონის კოდი",
    paintingLabel: "ნამუშევარი",
    amountLabel: "ფსონის თანხა",
    trackInstruction: "სტატუსის სანახავად გამოიყენეთ კოდი და ელფოსტა:",
    trackButtonLabel: "შეკვეთის ნახვა",
    adminSubject: (code) => `ახალი ფსონი ${code}`,
    adminTitle: "ახალი ფსონი",
    nameLabel: "მონაწილე",
    emailLabel: "ელფოსტა",
    phoneLabel: "ტელეფონი",
    noteLabel: "შენიშვნა",
    languageLabel: "ენა",
  },
  ru: {
    bidderSubject: (code) => `Ставка Artiani ${code}`,
    bidderTitle: "Ставка получена",
    bidderGreeting: "Здравствуйте",
    bidCodeLabel: "Код ставки",
    paintingLabel: "Работа",
    amountLabel: "Сумма ставки",
    trackInstruction: "Для отслеживания используйте код и ваш email:",
    trackButtonLabel: "Отследить заказ",
    adminSubject: (code) => `Новая ставка Artiani ${code}`,
    adminTitle: "Новая ставка",
    nameLabel: "Участник",
    emailLabel: "Email",
    phoneLabel: "Телефон",
    noteLabel: "Примечание",
    languageLabel: "Язык",
  },
};

const formatMoneyCents = (value: number) => `${(value / 100).toFixed(2)} GEL`;

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const sendBidEmails = async ({ bid, lang }: BidEmailPayload) => {
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
    const copy = COPY_BY_LANG[lang];
    const publicBaseUrl = getPublicBaseUrl();
    const trackUrl = `${publicBaseUrl}/${lang}/track`;
    const productTitle = bid.product_slug;
    const paymentInstructions = getPaymentInstructions(lang, bid.code, "auction");
    const bidAmount = formatMoneyCents(bid.bid_amount_cents);

    const bidderSubject = copy.bidderSubject(bid.code);
    const bidderHtml = `
      <h2>${copy.bidderTitle}</h2>
      <p>${copy.bidderGreeting} ${escapeHtml(bid.bidder_name)},</p>
      <p><strong>${copy.bidCodeLabel}:</strong> ${escapeHtml(bid.code)}</p>
      <p><strong>${copy.paintingLabel}:</strong> ${escapeHtml(productTitle)} (${escapeHtml(bid.product_slug)})</p>
      <p><strong>${copy.amountLabel}:</strong> ${bidAmount}</p>
      <p>${copy.trackInstruction}</p>
      <p>
        <a href="${trackUrl}" style="display:inline-block;padding:10px 16px;border:1px solid #111;border-radius:999px;text-decoration:none;color:#111;">
          ${copy.trackButtonLabel}
        </a>
      </p>
      ${paymentInstructions.html}
    `;
    const bidderText = [
      `${copy.bidderGreeting} ${bid.bidder_name},`,
      "",
      `${copy.bidCodeLabel}: ${bid.code}`,
      `${copy.paintingLabel}: ${productTitle} (${bid.product_slug})`,
      `${copy.amountLabel}: ${bidAmount}`,
      `${copy.trackInstruction} ${trackUrl}`,
      "",
      paymentInstructions.text,
    ].join("\n");

    const adminSubject = copy.adminSubject(bid.code);
    const adminHtml = `
      <h2>${copy.adminTitle}</h2>
      <p><strong>${copy.bidCodeLabel}:</strong> ${escapeHtml(bid.code)}</p>
      <p><strong>${copy.paintingLabel}:</strong> ${escapeHtml(productTitle)} (${escapeHtml(bid.product_slug)})</p>
      <p><strong>${copy.amountLabel}:</strong> ${bidAmount}</p>
      <p><strong>${copy.nameLabel}:</strong> ${escapeHtml(bid.bidder_name)}</p>
      <p><strong>${copy.emailLabel}:</strong> ${escapeHtml(bid.bidder_email)}</p>
      <p><strong>${copy.phoneLabel}:</strong> ${escapeHtml(bid.bidder_phone)}</p>
      <p><strong>${copy.languageLabel}:</strong> ${escapeHtml(lang)}</p>
      <p><strong>${copy.noteLabel}:</strong> ${escapeHtml(bid.note ?? "-")}</p>
      <p>${copy.trackButtonLabel}: <a href="${trackUrl}">${trackUrl}</a></p>
    `;
    const adminText = [
      `${copy.adminTitle}`,
      `${copy.bidCodeLabel}: ${bid.code}`,
      `${copy.paintingLabel}: ${productTitle} (${bid.product_slug})`,
      `${copy.amountLabel}: ${bidAmount}`,
      `${copy.nameLabel}: ${bid.bidder_name}`,
      `${copy.emailLabel}: ${bid.bidder_email}`,
      `${copy.phoneLabel}: ${bid.bidder_phone}`,
      `${copy.languageLabel}: ${lang}`,
      `${copy.noteLabel}: ${bid.note ?? "-"}`,
      "",
      `${copy.trackButtonLabel}: ${trackUrl}`,
    ].join("\n");

    await Promise.all([
      transport.sendMail({
        from: envMail.ORDERS_FROM_EMAIL,
        to: bid.bidder_email,
        subject: bidderSubject,
        html: bidderHtml,
        text: bidderText,
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
    console.error("SMTP bid email send failed", error);
    return { emailSent: false as const };
  }
};
