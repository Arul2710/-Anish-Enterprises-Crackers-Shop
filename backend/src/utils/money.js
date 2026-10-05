/**
 * All money is stored and computed as integer paise-style minor units would be
 * ideal, but the source sheet and the storefront both use whole rupees with two
 * decimals. These helpers round half-up at 2dp so a subtotal never drifts.
 */

export const roundMoney = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
};

export const isValidPrice = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= 1_000_000;
};

export const isValidQuantity = (value, max = 99) => {
  const amount = Number(value);
  return Number.isInteger(amount) && amount >= 1 && amount <= max;
};

export const percentageOf = (part, whole) => (whole > 0 ? roundMoney((part / whole) * 100) : 0);

export const sumMoney = (values) => roundMoney(values.reduce((total, value) => total + (Number(value) || 0), 0));

export default roundMoney;
