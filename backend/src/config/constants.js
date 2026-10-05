/**
 * Domain vocabulary shared by the models, validators and controllers.
 * Order and payment values mirror the strings the existing admin UI already
 * renders, so switching the frontend to the API does not change any label.
 */

export const ORDER_STATUS = Object.freeze({
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  READY_FOR_DISPATCH: 'Ready for Dispatch',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
});

export const ORDER_STATUSES = Object.values(ORDER_STATUS);

/**
 * Allowed forward moves. Cancellation is reachable from any open status because
 * stock has to be released; moving backwards is not allowed except for reopening
 * a cancelled order, which the UI already offers.
 */
export const ORDER_STATUS_TRANSITIONS = Object.freeze({
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.READY_FOR_DISPATCH, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.READY_FOR_DISPATCH]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED],
});

/** Statuses whose goods are still physically in the shop and hold reserved stock. */
export const OPEN_ORDER_STATUSES = Object.freeze([
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.READY_FOR_DISPATCH,
  ORDER_STATUS.SHIPPED,
]);

export const CLOSED_ORDER_STATUSES = Object.freeze([ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED]);

export const PAYMENT_STATUS = Object.freeze({
  UNPAID: 'Unpaid',
  PARTIAL: 'Partial',
  PAID: 'Paid',
  REFUNDED: 'Refunded',
});

export const PAYMENT_STATUSES = Object.values(PAYMENT_STATUS);

/** Only these count as verified money in the shop's favour. */
export const SETTLED_PAYMENT_STATUSES = Object.freeze([PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIAL]);

export const PAYMENT_METHOD = Object.freeze({
  ENQUIRY_CONFIRM: 'Enquiry - confirm by phone',
  CASH_ON_DELIVERY: 'Cash on delivery',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank transfer',
});

export const PAYMENT_METHODS = Object.values(PAYMENT_METHOD);

export const ADMIN_ROLE = Object.freeze({
  OWNER: 'owner',
  ADMIN: 'admin',
  STAFF: 'staff',
});

export const ADMIN_ROLES = Object.values(ADMIN_ROLE);

/**
 * Capability names match the permission keys the existing admin layout already
 * checks, so the current nav gating keeps working unchanged.
 */
export const PERMISSION = Object.freeze({
  PRODUCTS_VIEW: 'products:view',
  PRODUCTS_WRITE: 'products:write',
  INVENTORY_WRITE: 'inventory:write',
  ORDERS_VIEW: 'orders:view',
  ORDERS_WRITE: 'orders:write',
  CUSTOMERS_VIEW: 'customers:view',
  IMPORTS_RUN: 'imports:run',
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_WRITE: 'settings:write',
  ADMINS_MANAGE: 'admins:manage',
  REPORTS_VIEW: 'reports:view',
});

export const ROLE_PERMISSIONS = Object.freeze({
  [ADMIN_ROLE.OWNER]: Object.values(PERMISSION),
  [ADMIN_ROLE.ADMIN]: [
    PERMISSION.PRODUCTS_VIEW,
    PERMISSION.PRODUCTS_WRITE,
    PERMISSION.INVENTORY_WRITE,
    PERMISSION.ORDERS_VIEW,
    PERMISSION.ORDERS_WRITE,
    PERMISSION.CUSTOMERS_VIEW,
    PERMISSION.IMPORTS_RUN,
    PERMISSION.SETTINGS_VIEW,
    PERMISSION.SETTINGS_WRITE,
    PERMISSION.REPORTS_VIEW,
  ],
  [ADMIN_ROLE.STAFF]: [
    PERMISSION.PRODUCTS_VIEW,
    PERMISSION.INVENTORY_WRITE,
    PERMISSION.ORDERS_VIEW,
    PERMISSION.ORDERS_WRITE,
    PERMISSION.CUSTOMERS_VIEW,
    PERMISSION.REPORTS_VIEW,
  ],
});

export const roleHasPermission = (role, permission) =>
  (ROLE_PERMISSIONS[role] || []).includes(permission);

export const PRODUCT_STATUS = Object.freeze({ ACTIVE: 'active', INACTIVE: 'inactive' });
export const PRODUCT_STATUSES = Object.values(PRODUCT_STATUS);

export const PRODUCT_SOURCES = Object.freeze({ EXCEL: 'excel', MANUAL: 'manual' });

/** The two catalogue families the storefront treats as bundles rather than SKUs. */
export const GIFT_BOX_CATEGORY = 'CRACKERS GIFT BOX';
export const COMBO_CATEGORY = 'COMBO PACK';

export const MAX_CART_QUANTITY = 99;

export const SORTABLE_PRODUCT_FIELDS = Object.freeze([
  'createdAt',
  'updatedAt',
  'name',
  'sellingPrice',
  'mrp',
  'code',
  'sourceSerial',
]);

export const SORTABLE_ORDER_FIELDS = Object.freeze(['createdAt', 'updatedAt', 'total', 'reference']);

export const CATEGORY_TONES = Object.freeze([
  'amber',
  'rose',
  'violet',
  'blue',
  'green',
  'orange',
  'pink',
  'yellow',
  'cyan',
  'purple',
  'red',
]);
