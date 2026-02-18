import { CURRENCY_SYMBOL } from "../constants";

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatNumberWithSeparators = (value: number): string =>
  numberFormatter.format(Number.isFinite(value) ? value : 0);

export const formatCurrency = (value: number): string =>
  `${CURRENCY_SYMBOL}${formatNumberWithSeparators(value)}`;
