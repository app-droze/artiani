const numberFormatter = new Intl.NumberFormat("ka-GE", {
  maximumFractionDigits: 0,
});

export const formatMoney = (value: number) =>
  `${numberFormatter.format(value)} ₾`;
