export const ADMIN_TONES = {
  income: {
    surface: "border-[#cfe2d0] bg-[#eef6ef]",
    text: "text-[#2f6f4f]",
  },
  expense: {
    surface: "border-[#e4c7c0] bg-[#fbefec]",
    text: "text-[#8a3b2d]",
  },
  warning: {
    surface: "border-[#ead6ad] bg-[#fbf3e4]",
    text: "text-[#956b18]",
  },
  info: {
    surface: "border-[#ccdae6] bg-[#edf3f7]",
    text: "text-[#35556f]",
  },
  neutral: {
    surface: "border-[var(--border-soft)] bg-[#faf6f0]",
    text: "text-[color:var(--text-strong)]",
  },
} as const;

export type AdminToneName = keyof typeof ADMIN_TONES;

export const getSignedMoneyTone = (value: number | null | undefined): AdminToneName => {
  const safeValue = value ?? 0;
  if (safeValue > 0) {
    return "income";
  }
  if (safeValue < 0) {
    return "expense";
  }
  return "neutral";
};

export const getAdminStatusTone = (status: string): AdminToneName => {
  switch (status) {
    case "awaiting_payment":
    case "pending":
    case "paid":
      return "warning";
    case "processing":
      return "info";
    case "shipped":
    case "completed":
      return "income";
    case "cancelled":
      return "expense";
    default:
      return "neutral";
  }
};

export const getAdminFeedbackTone = (isSuccess: boolean): AdminToneName =>
  isSuccess ? "income" : "expense";

export const formatAdminMoney = (value: number | null | undefined) =>
  `${(value ?? 0).toFixed(2)} ₾`;

export const formatAdminSignedMoney = (value: number | null | undefined) => {
  const safeValue = value ?? 0;
  const sign = safeValue > 0 ? "+" : "";
  return `${sign}${safeValue.toFixed(2)} ₾`;
};
