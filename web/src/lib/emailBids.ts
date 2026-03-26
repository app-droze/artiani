import "server-only";

import nodemailer from "nodemailer";
import {
  envMail,
  getPublicBaseUrl,
  getPublicBaseUrlDiagnostics,
  mailEnvDiagnostics,
} from "@/src/lib/env.server";
import type { Locale } from "@/src/i18n/locales";

type AuctionBidEmailPayload = {
  lang: Locale;
  bid: {
    bidId: string;
    productSlug: string;
    productTitle: string;
    bidderName: string;
    bidderEmail: string;
    orderCode: string;
    bidAmount: number;
    auctionEndTime: string;
  };
};

type SendAuctionBidEmailsResult = {
  emailAttempted: boolean;
  emailSent: boolean;
  emailDebugReason: string | null;
};

type EmailCopy = {
  bidderSubject: (productTitle: string) => string;
  bidderTitle: string;
  bidderGreeting: string;
  productLabel: string;
  bidAmountLabel: string;
  auctionEndTimeLabel: string;
  orderCodeLabel: string;
  extensionNote: string;
  adminSubject: (productTitle: string) => string;
  adminTitle: string;
  bidderEmailLabel: string;
  languageLabel: string;
};

const EMAIL_COPY: Record<Locale, EmailCopy> = {
  en: {
    bidderSubject: (productTitle) => `Artiani bid received — ${productTitle}`,
    bidderTitle: "Your bid was received",
    bidderGreeting: "Hello",
    productLabel: "Painting",
    bidAmountLabel: "Bid amount",
    auctionEndTimeLabel: "Auction end time",
    orderCodeLabel: "Order code used",
    extensionNote:
      "If a valid bid is placed in the final 10 minutes, the auction is extended by 10 minutes.",
    adminSubject: (productTitle) => `New Artiani auction bid — ${productTitle}`,
    adminTitle: "New auction bid",
    bidderEmailLabel: "Bidder email",
    languageLabel: "Language",
  },
  ka: {
    bidderSubject: (productTitle) => `Artiani — ფსონი მიღებულია: ${productTitle}`,
    bidderTitle: "თქვენი ფსონი მიღებულია",
    bidderGreeting: "გამარჯობა",
    productLabel: "ნამუშევარი",
    bidAmountLabel: "ფსონის თანხა",
    auctionEndTimeLabel: "აუქციონის დასრულების დრო",
    orderCodeLabel: "გამოყენებული შეკვეთის კოდი",
    extensionNote:
      "თუ ბოლო 10 წუთში განთავსდება ფსონი, აუქციონი 10 წუთით გაგრძელდება.",
    adminSubject: (productTitle) => `ახალი აუქციონის ფსონი — ${productTitle}`,
    adminTitle: "ახალი აუქციონის ფსონი",
    bidderEmailLabel: "მონაწილის ელფოსტა",
    languageLabel: "ენა",
  },
};

const logBidEmail = (
  message: string,
  details?: Record<string, string | number | boolean | null | undefined>,
) => {
  console.info("[auction-bid-email]", message, details ?? {});
};

const readMailErrorDetails = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return {
      code: null,
      responseCode: null,
      command: null,
      message: "Unknown mail error",
    };
  }

  const candidate = error as {
    code?: unknown;
    responseCode?: unknown;
    command?: unknown;
    message?: unknown;
  };

  return {
    code: typeof candidate.code === "string" ? candidate.code : null,
    responseCode:
      typeof candidate.responseCode === "number" ? candidate.responseCode : null,
    command: typeof candidate.command === "string" ? candidate.command : null,
    message:
      typeof candidate.message === "string" && candidate.message.trim().length > 0
        ? candidate.message
        : "Unknown mail error",
  };
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatMoney = (value: number) => `${value} GEL`;

export const sendAuctionBidEmails = async ({
  bid,
  lang,
}: AuctionBidEmailPayload): Promise<SendAuctionBidEmailsResult> => {
  const publicBaseUrlDiagnostics = getPublicBaseUrlDiagnostics();
  logBidEmail("mail flow entered", {
    bidId: bid.bidId,
    productSlug: bid.productSlug,
    ...mailEnvDiagnostics,
    hasPublicBaseUrl:
      !publicBaseUrlDiagnostics.usesLocalhostFallback ||
      publicBaseUrlDiagnostics.hasConfiguredPublicBaseUrl,
    publicBaseUrlEnv: publicBaseUrlDiagnostics.chosenPublicBaseUrlEnv,
    usesLocalhostFallback: publicBaseUrlDiagnostics.usesLocalhostFallback,
  });

  if (!envMail) {
    logBidEmail("mail env missing, skipping send", {
      bidId: bid.bidId,
      productSlug: bid.productSlug,
      ...mailEnvDiagnostics,
    });
    return {
      emailAttempted: false,
      emailSent: false,
      emailDebugReason: "missing_mail_env",
    };
  }

  let transport: nodemailer.Transporter;
  try {
    transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: envMail.GMAIL_USER,
        pass: envMail.GMAIL_APP_PASSWORD,
      },
    });
    logBidEmail("transporter created", {
      bidId: bid.bidId,
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
    });
  } catch (error) {
    const details = readMailErrorDetails(error);
    console.error("[auction-bid-email] transporter creation failed", details);
    return {
      emailAttempted: false,
      emailSent: false,
      emailDebugReason: details.code
        ? `transporter_create_failed:${details.code}`
        : "transporter_create_failed",
    };
  }

  try {
    const copy = EMAIL_COPY[lang];
    const publicBaseUrl = getPublicBaseUrl();
    const productUrl = `${publicBaseUrl}/${lang}/product/${bid.productSlug}`;
    const bidAmount = formatMoney(bid.bidAmount);

    const bidderSubject = copy.bidderSubject(bid.productTitle);
    const bidderHtml = `
      <h2>${copy.bidderTitle}</h2>
      <p>${copy.bidderGreeting} ${escapeHtml(bid.bidderName)},</p>
      <p><strong>${copy.productLabel}:</strong> ${escapeHtml(bid.productTitle)}</p>
      <p><strong>${copy.bidAmountLabel}:</strong> ${escapeHtml(bidAmount)}</p>
      <p><strong>${copy.auctionEndTimeLabel}:</strong> ${escapeHtml(bid.auctionEndTime)}</p>
      <p><strong>${copy.orderCodeLabel}:</strong> ${escapeHtml(bid.orderCode)}</p>
      <p>${escapeHtml(copy.extensionNote)}</p>
      <p><a href="${productUrl}">${escapeHtml(productUrl)}</a></p>
    `;
    const bidderText = [
      `${copy.bidderGreeting} ${bid.bidderName},`,
      "",
      `${copy.bidderTitle}`,
      `${copy.productLabel}: ${bid.productTitle}`,
      `${copy.bidAmountLabel}: ${bidAmount}`,
      `${copy.auctionEndTimeLabel}: ${bid.auctionEndTime}`,
      `${copy.orderCodeLabel}: ${bid.orderCode}`,
      copy.extensionNote,
      "",
      productUrl,
    ].join("\n");

    const adminSubject = copy.adminSubject(bid.productTitle);
    const adminHtml = `
      <h2>${copy.adminTitle}</h2>
      <p><strong>${copy.productLabel}:</strong> ${escapeHtml(bid.productTitle)} (${escapeHtml(bid.productSlug)})</p>
      <p><strong>${copy.bidAmountLabel}:</strong> ${escapeHtml(bidAmount)}</p>
      <p><strong>${copy.auctionEndTimeLabel}:</strong> ${escapeHtml(bid.auctionEndTime)}</p>
      <p><strong>${copy.bidderEmailLabel}:</strong> ${escapeHtml(bid.bidderEmail)}</p>
      <p><strong>${copy.orderCodeLabel}:</strong> ${escapeHtml(bid.orderCode)}</p>
      <p><strong>${copy.languageLabel}:</strong> ${escapeHtml(lang)}</p>
      <p><a href="${productUrl}">${escapeHtml(productUrl)}</a></p>
    `;
    const adminText = [
      copy.adminTitle,
      `${copy.productLabel}: ${bid.productTitle} (${bid.productSlug})`,
      `${copy.bidAmountLabel}: ${bidAmount}`,
      `${copy.auctionEndTimeLabel}: ${bid.auctionEndTime}`,
      `${copy.bidderEmailLabel}: ${bid.bidderEmail}`,
      `${copy.orderCodeLabel}: ${bid.orderCode}`,
      `${copy.languageLabel}: ${lang}`,
      "",
      productUrl,
    ].join("\n");

    logBidEmail("sendMail reached", {
      bidId: bid.bidId,
      customerRecipientPresent: bid.bidderEmail.length > 0,
      adminRecipientPresent: envMail.ORDERS_ADMIN_EMAIL.length > 0,
    });

    await Promise.all([
      transport.sendMail({
        from: envMail.ORDERS_FROM_EMAIL,
        to: bid.bidderEmail,
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

    logBidEmail("sendMail completed", {
      bidId: bid.bidId,
      customerEmailSent: true,
      adminEmailSent: true,
    });

    return {
      emailAttempted: true,
      emailSent: true,
      emailDebugReason: null,
    };
  } catch (error) {
    const details = readMailErrorDetails(error);
    console.error("[auction-bid-email] sendMail failed", details);
    return {
      emailAttempted: true,
      emailSent: false,
      emailDebugReason: details.code
        ? `send_failed:${details.code}`
        : details.responseCode
          ? `send_failed:${details.responseCode}`
          : "send_failed",
    };
  }
};
