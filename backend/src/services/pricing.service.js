import { ApiError } from '../utils/ApiError.js';
import { roundMoney } from '../utils/money.js';

/**
 * Single place where money is derived. Controllers never add up prices
 * themselves, so pricing configuration cannot drift between flows.
 */
export const calculateTotals = ({ items, settings, discount = 0, deliveryOverride }) => {
  const pricing = settings?.payments?.pricing || {};
  const delivery = settings?.delivery || {};

  const itemsTotal = roundMoney(items.reduce((total, item) => total + item.unitPrice * item.quantity, 0));
  const mrpTotal = roundMoney(items.reduce((total, item) => total + (item.mrp || 0) * item.quantity, 0));

  // A discount may not exceed the goods value, otherwise the total goes negative.
  let appliedDiscount = roundMoney(discount);
  if (appliedDiscount > itemsTotal) appliedDiscount = itemsTotal;

  // Build the goods value first, then decide delivery, then add it. Doing it in
  // this order is what keeps `grandTotal` consistent with the `deliveryFee` that
  // is reported and persisted alongside it.
  let goodsTotal = roundMoney(Math.max(0, itemsTotal - appliedDiscount));

  const taxPercent = pricing.includeTax ? Number(pricing.taxPercent) || 0 : 0;
  if (taxPercent > 0) goodsTotal = roundMoney(goodsTotal + (goodsTotal * taxPercent) / 100);

  const step = Number(pricing.roundToNearest) || 0;
  if (step > 0 && step <= 10) goodsTotal = roundMoney(Math.round(goodsTotal / step) * step);

  // Free delivery is judged on the goods value, which is what the customer sees
  // before delivery is added.
  let deliveryFee =
    deliveryOverride !== undefined && deliveryOverride !== null ? roundMoney(deliveryOverride) : roundMoney(delivery.deliveryFee || 0);

  const freeAbove = Number(delivery.freeDeliveryAbove) || 0;
  if (freeAbove > 0 && goodsTotal >= freeAbove) deliveryFee = 0;

  return {
    itemsTotal,
    mrpTotal,
    deliveryFee,
    discount: appliedDiscount,
    taxPercent,
    totalSavings: roundMoney(Math.max(0, mrpTotal - itemsTotal)),
    grandTotal: roundMoney(goodsTotal + deliveryFee),
  };
};

/** Blocks checkout below the shop's minimum, as configured in settings. */
export const assertMinimumOrder = (total, settings) => {
  const minimum = Number(settings?.minimumOrderAmount) || 0;
  if (minimum > 0 && total < minimum) {
    throw ApiError.unprocessable(`The minimum order value is ₹${minimum}. Please add more items to continue.`, {
      code: 'below_minimum_order',
      details: { minimumOrderAmount: minimum, currentTotal: roundMoney(total) },
    });
  }
};

export const assertDeliveryAvailable = (settings) => {
  if (settings?.delivery?.isDeliveryAvailable === false) {
    throw ApiError.unprocessable('Online delivery is not available right now. Please contact the shop directly.', {
      code: 'delivery_unavailable',
    });
  }
};

export const assertPaymentMethodEnabled = (method, settings) => {
  const enabled = settings?.payments?.enabledMethods || [];
  if (method && enabled.length && !enabled.includes(method)) {
    throw ApiError.unprocessable(`${method} is not currently accepted.`, { code: 'payment_method_disabled' });
  }
};
