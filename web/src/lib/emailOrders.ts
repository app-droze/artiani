import "server-only";

import nodemailer from "nodemailer";
import {
  envMail,
  getExternalPublicBaseUrl,
  getPublicBaseUrlDiagnostics,
  mailEnvDiagnostics,
} from "@/src/lib/env.server";
import {
  DEFAULT_PAYMENT_METHOD,
  isPaymentMethod,
  type PaymentMethod,
} from "@/src/lib/paymentMethod";
import { getPaymentInstructions } from "@/src/lib/paymentInstructions";
import { defaultLocale, isLocale, type Locale } from "@/src/i18n/locales";

type OrderLineItem = {
  title_en: string;
  title_ka: string;
  product_kind: string;
  qty: number;
  line_total_cents: number;
  options: {
    signature?: boolean;
    card_back?: "postcard" | "greeting" | null;
    variant_id?: string;
    color_label?: string | null;
    background_label?: string | null;
    material_label?: string | null;
    phone_model_label?: string | null;
    size_label?: string | null;
    print_side?: "one_sided" | "both_sided" | null;
    print_side_label?: string | null;
  };
};

type OrderEmailPayload = {
  order: {
    code: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    payment_method: PaymentMethod;
    delivery_area: "tbilisi" | "region";
    address: string;
    customer_note: string | null;
    subtotal_cents: number;
    total_cents: number;
  };
  items: OrderLineItem[];
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
  paymentMethodLabel: string;
  paymentMethodValues: Record<PaymentMethod, string>;
  bankTransferCustomerNote: string;
  cashOnDeliveryCustomerNote: string;
  adminSubject: (code: string) => string;
  adminTitle: string;
  customerNameLabel: string;
  customerEmailLabel: string;
  customerPhoneLabel: string;
  deliveryAreaLabel: string;
  addressLabel: string;
  languageLabel: string;
  subtotalLabel: string;
  noteLabel: string;
  itemsLabel: string;
  deliveryAreaValues: {
    tbilisi: string;
    region: string;
  };
  kindLabels: Record<string, string>;
  optionSignature: string;
  optionCardPostcard: string;
  optionCardGreeting: string;
  optionColorLabel: string;
  optionBackgroundLabel: string;
  optionMaterialLabel: string;
  optionPhoneModelLabel: string;
  optionSizeLabel: string;
  optionPrintSideLabel: string;
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
    paymentMethodLabel: "Payment method",
    paymentMethodValues: {
      bank_transfer: "Bank transfer",
      cash_on_delivery: "Pay on delivery",
    },
    bankTransferCustomerNote: "Please complete the bank transfer using the details below.",
    cashOnDeliveryCustomerNote: "Please keep your order code. Payment will be collected by the courier on delivery.",
    adminSubject: (code) => `New Artiani order ${code}`,
    adminTitle: "New order",
    customerNameLabel: "Customer",
    customerEmailLabel: "Email",
    customerPhoneLabel: "Phone",
    deliveryAreaLabel: "Delivery area",
    addressLabel: "Address",
    languageLabel: "Language",
    subtotalLabel: "Subtotal",
    noteLabel: "Note",
    itemsLabel: "Items",
    deliveryAreaValues: {
      tbilisi: "Tbilisi",
      region: "Region",
    },
    kindLabels: {
      cards: "cards",
      bookmarks: "bookmarks",
      calendars: "calendar",
      paintings: "painting",
      prints: "print",
      tablecloths: "tablecloth",
      tablecloth_round: "round tablecloth",
      tablecloth_square: "rectangular tablecloth",
      table_runner: "table runner",
      pillow: "pillow",
      scarf: "scarf",
      phone_case: "phone case",
      handbag: "bag",
    },
    optionSignature: "signed",
    optionCardPostcard: "postcard back",
    optionCardGreeting: "greeting card back",
    optionColorLabel: "Color",
    optionBackgroundLabel: "Background",
    optionMaterialLabel: "Material",
    optionPhoneModelLabel: "Phone model",
    optionSizeLabel: "Size",
    optionPrintSideLabel: "Print side",
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
    paymentMethodLabel: "გადახდის მეთოდი",
    paymentMethodValues: {
      bank_transfer: "საბანკო გადარიცხვა",
      cash_on_delivery: "კურიერთან გადახდა",
    },
    bankTransferCustomerNote: "გთხოვთ, ქვემოთ მოცემული დეტალებით დაასრულოთ საბანკო გადარიცხვა.",
    cashOnDeliveryCustomerNote: "შეინახეთ შეკვეთის კოდი. გადახდა მოხდება კურიერთან, მიწოდების დროს.",
    adminSubject: (code) => `ახალი შეკვეთა ${code}`,
    adminTitle: "ახალი შეკვეთა",
    customerNameLabel: "კლიენტი",
    customerEmailLabel: "ელფოსტა",
    customerPhoneLabel: "ტელეფონი",
    deliveryAreaLabel: "მიწოდების ზონა",
    addressLabel: "მისამართი",
    languageLabel: "ენა",
    subtotalLabel: "ქვეჯამი",
    noteLabel: "შენიშვნა",
    itemsLabel: "ნივთები",
    deliveryAreaValues: {
      tbilisi: "თბილისი",
      region: "რეგიონი",
    },
    kindLabels: {
      cards: "ბარათები",
      bookmarks: "სანიშნეები",
      calendars: "კალენდარი",
      paintings: "ნახატი",
      prints: "პრინტი",
      tablecloths: "სუფრა",
      tablecloth_round: "მრგვალი სუფრა",
      tablecloth_square: "მართკუთხა სუფრა",
      table_runner: "მაგიდის რანერი",
      pillow: "ბალიში",
      scarf: "თავსაფარი",
      phone_case: "ტელეფონის ჩასადები",
      handbag: "ჩანთა",
    },
    optionSignature: "ხელმოწერილი",
    optionCardPostcard: "ფორმატი: საფოსტო ბარათი",
    optionCardGreeting: "ფორმატი: მისალოცი ბარათი",
    optionColorLabel: "ფერი",
    optionBackgroundLabel: "ფონი",
    optionMaterialLabel: "მასალა",
    optionPhoneModelLabel: "ტელეფონის მოდელი",
    optionSizeLabel: "ზომა",
    optionPrintSideLabel: "ბეჭდვის მხარე",
  },
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const pickItemTitle = (item: OrderLineItem, lang: Locale) =>
  lang === "ka" ? item.title_ka : item.title_en;

const describeItem = (item: OrderLineItem, copy: EmailCopy) => {
  const details: string[] = [copy.kindLabels[item.product_kind] ?? item.product_kind];

  if (item.options.signature) {
    details.push(copy.optionSignature);
  }
  if (item.options.card_back === "postcard") {
    details.push(copy.optionCardPostcard);
  }
  if (item.options.card_back === "greeting") {
    details.push(copy.optionCardGreeting);
  }
  if (item.options.color_label) {
    details.push(`${copy.optionColorLabel}: ${item.options.color_label}`);
  }
  if (item.options.background_label && item.options.background_label !== item.options.color_label) {
    details.push(`${copy.optionBackgroundLabel}: ${item.options.background_label}`);
  }
  if (item.options.material_label) {
    details.push(`${copy.optionMaterialLabel}: ${item.options.material_label}`);
  }
  if (item.options.phone_model_label) {
    details.push(`${copy.optionPhoneModelLabel}: ${item.options.phone_model_label}`);
  }
  if (item.options.size_label) {
    details.push(`${copy.optionSizeLabel}: ${item.options.size_label}`);
  }
  if (item.options.print_side_label) {
    details.push(`${copy.optionPrintSideLabel}: ${item.options.print_side_label}`);
  }

  return details.join(", ");
};

const buildItemsHtml = (items: OrderLineItem[], lang: Locale, copy: EmailCopy) =>
  items
    .map(
      (item) =>
        `<li><strong>${escapeHtml(pickItemTitle(item, lang))}</strong> (${escapeHtml(describeItem(item, copy))}) × ${item.qty} — ${formatMoneyCents(item.line_total_cents)}</li>`,
    )
    .join("");

const buildItemsText = (items: OrderLineItem[], lang: Locale, copy: EmailCopy) =>
  items
    .map(
      (item) =>
        `- ${pickItemTitle(item, lang)} (${describeItem(item, copy)}) x ${item.qty} — ${formatMoneyCents(item.line_total_cents)}`,
    )
    .join("\n");

type SendOrderEmailsResult = {
  emailAttempted: boolean;
  emailSent: boolean;
  emailDebugReason: string | null;
};

const logOrderEmail = (
  message: string,
  details?: Record<string, string | number | boolean | null | undefined>,
) => {
  console.info("[order-email]", message, details ?? {});
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

const createOrderMailTransport = (orderCode: string) => {
  if (!envMail) {
    logOrderEmail("mail env missing, skipping send", {
      orderCode,
      ...mailEnvDiagnostics,
    });
    return null;
  }

  try {
    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: envMail.GMAIL_USER,
        pass: envMail.GMAIL_APP_PASSWORD,
      },
    });
    logOrderEmail("transporter created", {
      orderCode,
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
    });
    return transport;
  } catch (error) {
    const details = readMailErrorDetails(error);
    console.error("[order-email] transporter creation failed", details);
    return null;
  }
};

export const sendOrderEmails = async ({ order, items, lang }: OrderEmailPayload) => {
  const publicBaseUrlDiagnostics = getPublicBaseUrlDiagnostics();
  logOrderEmail("mail flow entered", {
    orderCode: order.code,
    ...mailEnvDiagnostics,
    hasPublicBaseUrl: !publicBaseUrlDiagnostics.usesLocalhostFallback || publicBaseUrlDiagnostics.hasConfiguredPublicBaseUrl,
    publicBaseUrlEnv: publicBaseUrlDiagnostics.chosenPublicBaseUrlEnv,
    usesLocalhostFallback: publicBaseUrlDiagnostics.usesLocalhostFallback,
  });

  const transport = createOrderMailTransport(order.code);
  if (!transport || !envMail) {
    return {
      emailAttempted: Boolean(envMail),
      emailSent: false,
      emailDebugReason: envMail ? "transporter_create_failed" : "missing_mail_env",
    } satisfies SendOrderEmailsResult;
  }

  try {
    const copy = EMAIL_COPY[lang];
    const publicBaseUrl = getExternalPublicBaseUrl();
    const trackUrl = `${publicBaseUrl}/${lang}/track`;
    const itemsHtml = buildItemsHtml(items, lang, copy);
    const itemsText = buildItemsText(items, lang, copy);
    const paymentMethod = isPaymentMethod(order.payment_method)
      ? order.payment_method
      : DEFAULT_PAYMENT_METHOD;
    const paymentMethodLabel = copy.paymentMethodValues[paymentMethod];
    const paymentInstructions =
      paymentMethod === "bank_transfer" ? getPaymentInstructions(lang, order.code) : null;
    const deliveryAreaLabel = copy.deliveryAreaValues[order.delivery_area];

    const customerSubject = copy.customerSubject(order.code);
    const customerHtml = `
      <h2>${copy.customerTitle}</h2>
      <p>${copy.customerGreeting} ${escapeHtml(order.customer_name)},</p>
      <p><strong>${copy.orderCodeLabel}:</strong> ${escapeHtml(order.code)}</p>
      <p><strong>${copy.paymentMethodLabel}:</strong> ${escapeHtml(paymentMethodLabel)}</p>
      <p>${copy.trackInstruction}</p>
      <p>
        <a href="${trackUrl}" style="display:inline-block;padding:10px 16px;border:1px solid #111;border-radius:999px;text-decoration:none;color:#111;">
          ${copy.trackButtonLabel}
        </a>
      </p>
      <p><strong>${copy.deliveryAreaLabel}:</strong> ${escapeHtml(deliveryAreaLabel)}</p>
      <p><strong>${copy.addressLabel}:</strong> ${escapeHtml(order.address)}</p>
      <p><strong>${copy.noteLabel}:</strong> ${escapeHtml(order.customer_note ?? "-")}</p>
      <p>${copy.orderSummaryLabel}:</p>
      <ul>${itemsHtml}</ul>
      <p>${copy.totalLabel}: <strong>${formatMoneyCents(order.total_cents)}</strong></p>
      <p>${paymentMethod === "bank_transfer" ? copy.bankTransferCustomerNote : copy.cashOnDeliveryCustomerNote}</p>
      ${paymentInstructions?.html ?? ""}
    `;
    const customerText = [
      `${copy.customerGreeting} ${order.customer_name},`,
      "",
      `${copy.customerTitle}`,
      "",
      `${copy.orderCodeLabel}: ${order.code}`,
      `${copy.paymentMethodLabel}: ${paymentMethodLabel}`,
      `${copy.trackInstruction} ${trackUrl}`,
      "",
      `${copy.deliveryAreaLabel}: ${deliveryAreaLabel}`,
      `${copy.addressLabel}: ${order.address}`,
      `${copy.noteLabel}: ${order.customer_note ?? "-"}`,
      "",
      `${copy.orderSummaryLabel}:`,
      itemsText,
      "",
      `${copy.totalLabel}: ${formatMoneyCents(order.total_cents)}`,
      "",
      paymentMethod === "bank_transfer" ? copy.bankTransferCustomerNote : copy.cashOnDeliveryCustomerNote,
      ...(paymentInstructions ? ["", paymentInstructions.text] : []),
    ].join("\n");

    const adminSubject = copy.adminSubject(order.code);
    const adminHtml = `
      <h2>${copy.adminTitle}</h2>
      <p><strong>${escapeHtml(order.code)}</strong></p>
      <p>${copy.customerNameLabel}: ${escapeHtml(order.customer_name)}</p>
      <p>${copy.customerEmailLabel}: ${escapeHtml(order.customer_email)}</p>
      <p>${copy.customerPhoneLabel}: ${escapeHtml(order.customer_phone)}</p>
      <p>${copy.paymentMethodLabel}: ${escapeHtml(paymentMethodLabel)}</p>
      <p>${copy.deliveryAreaLabel}: ${escapeHtml(deliveryAreaLabel)}</p>
      <p>${copy.addressLabel}: ${escapeHtml(order.address)}</p>
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
      `${copy.paymentMethodLabel}: ${paymentMethodLabel}`,
      `${copy.deliveryAreaLabel}: ${deliveryAreaLabel}`,
      `${copy.addressLabel}: ${order.address}`,
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

    logOrderEmail("sendMail reached", {
      orderCode: order.code,
      customerRecipientPresent: order.customer_email.length > 0,
      adminRecipientPresent: envMail.ORDERS_ADMIN_EMAIL.length > 0,
    });

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

    logOrderEmail("sendMail completed", {
      orderCode: order.code,
      customerEmailSent: true,
      adminEmailSent: true,
    });

    return {
      emailAttempted: true,
      emailSent: true,
      emailDebugReason: null,
    } satisfies SendOrderEmailsResult;
  } catch (error) {
    const details = readMailErrorDetails(error);
    console.error("[order-email] sendMail failed", details);
    return {
      emailAttempted: true,
      emailSent: false,
      emailDebugReason: details.code
        ? `send_failed:${details.code}`
        : details.responseCode
          ? `send_failed:${details.responseCode}`
          : "send_failed",
    } satisfies SendOrderEmailsResult;
  }
};

type OrderPaidEmailPayload = {
  order: {
    code: string;
    customer_name: string;
    customer_email: string;
    payment_method: string | null;
    total_amount: number;
    lang: string | null;
  };
};

const ORDER_PAID_COPY: Record<Locale, {
  subject: (code: string) => string;
  greeting: string;
  title: string;
  body: string;
  orderCodeLabel: string;
  totalLabel: string;
  paymentMethodLabel: string;
  paymentMethodValues: Record<PaymentMethod, string>;
  trackInstruction: string;
  trackButtonLabel: string;
}> = {
  en: {
    subject: (code) => `Payment received for order ${code}`,
    greeting: "Hello",
    title: "Payment received",
    body: "We have received your payment and your order is now confirmed.",
    orderCodeLabel: "Order code",
    totalLabel: "Total",
    paymentMethodLabel: "Payment method",
    paymentMethodValues: {
      bank_transfer: "Bank transfer",
      cash_on_delivery: "Pay on delivery",
    },
    trackInstruction: "You can track the current status here:",
    trackButtonLabel: "Track order",
  },
  ka: {
    subject: (code) => `გადახდა მიღებულია შეკვეთაზე ${code}`,
    greeting: "გამარჯობა",
    title: "გადახდა მიღებულია",
    body: "თქვენი გადახდა მიღებულია და შეკვეთა დადასტურებულია.",
    orderCodeLabel: "შეკვეთის კოდი",
    totalLabel: "ჯამი",
    paymentMethodLabel: "გადახდის მეთოდი",
    paymentMethodValues: {
      bank_transfer: "საბანკო გადარიცხვა",
      cash_on_delivery: "კურიერთან გადახდა",
    },
    trackInstruction: "სტატუსის სანახავად გამოიყენეთ ეს ბმული:",
    trackButtonLabel: "შეკვეთის ნახვა",
  },
};

export const sendOrderPaidStatusEmail = async ({ order }: OrderPaidEmailPayload) => {
  const transport = createOrderMailTransport(order.code);
  if (!transport || !envMail) {
    return;
  }

  const rawLang = order.lang ?? "";
  const lang: Locale = isLocale(rawLang) ? rawLang : defaultLocale;
  const copy = ORDER_PAID_COPY[lang];
  const rawPaymentMethod = order.payment_method ?? "";
  const paymentMethod: PaymentMethod = isPaymentMethod(rawPaymentMethod)
    ? rawPaymentMethod
    : DEFAULT_PAYMENT_METHOD;
  const trackUrl = `${getExternalPublicBaseUrl()}/${lang}/track`;
  const paymentMethodLabel = copy.paymentMethodValues[paymentMethod];
  const totalLabel = `${order.total_amount} GEL`;

  try {
    await transport.sendMail({
      from: envMail.ORDERS_FROM_EMAIL,
      to: order.customer_email,
      subject: copy.subject(order.code),
      html: `
        <h2>${copy.title}</h2>
        <p>${copy.greeting} ${escapeHtml(order.customer_name)},</p>
        <p>${copy.body}</p>
        <p><strong>${copy.orderCodeLabel}:</strong> ${escapeHtml(order.code)}</p>
        <p><strong>${copy.paymentMethodLabel}:</strong> ${escapeHtml(paymentMethodLabel)}</p>
        <p><strong>${copy.totalLabel}:</strong> ${escapeHtml(totalLabel)}</p>
        <p>${copy.trackInstruction}</p>
        <p>
          <a href="${trackUrl}" style="display:inline-block;padding:10px 16px;border:1px solid #111;border-radius:999px;text-decoration:none;color:#111;">
            ${copy.trackButtonLabel}
          </a>
        </p>
      `,
      text: [
        `${copy.greeting} ${order.customer_name},`,
        "",
        copy.body,
        "",
        `${copy.orderCodeLabel}: ${order.code}`,
        `${copy.paymentMethodLabel}: ${paymentMethodLabel}`,
        `${copy.totalLabel}: ${totalLabel}`,
        "",
        `${copy.trackInstruction} ${trackUrl}`,
      ].join("\n"),
    });
    logOrderEmail("paid status email sent", {
      orderCode: order.code,
      customerEmailSent: true,
    });
  } catch (error) {
    const details = readMailErrorDetails(error);
    console.error("[order-email] paid status sendMail failed", details);
  }
};
