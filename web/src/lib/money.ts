const formatWholeNumber = (value: number) => {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  const absolute = Math.abs(rounded).toString();
  const grouped = absolute.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${grouped}`;
};

export const formatMoney = (value: number) => `${formatWholeNumber(value)} ₾`;
