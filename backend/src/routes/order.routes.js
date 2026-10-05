import { Router } from 'express';
import {
  getCheckoutOptions,
  getCustomerOrder,
  getOrder,
  listAllOrders,
  listCustomers,
  getCustomer,
  placeCustomerOrder,
  setOrderPayment,
  setOrderStatus,
} from '../controllers/order.controller.js';
import { requireAuth, requirePermission } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { orderLimiter, writeLimiter } from '../middleware/rateLimit.middleware.js';
import { PERMISSION } from '../config/constants.js';
import {
  customerIdParamSchema,
  listCustomersQuerySchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
  orderReferenceParamSchema,
  placeOrderSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
} from '../validators/order.validator.js';

const router = Router();

// ------------------------------------------------------------------ public
router.get('/checkout-options', getCheckoutOptions);

// Rate limited harder than reads: this is the endpoint that writes orders.
router.post('/', orderLimiter, validate(placeOrderSchema), placeCustomerOrder);

// A customer reads their own order using the access token issued at placement.
router.get(
  '/reference/:reference',
  validate(orderReferenceParamSchema, 'params'),
  getCustomerOrder,
);

// ------------------------------------------------------------------- admin
router.get('/', requireAuth, requirePermission(PERMISSION.ORDERS_VIEW), validate(listOrdersQuerySchema), listAllOrders);

router.get('/customers', requireAuth, requirePermission(PERMISSION.CUSTOMERS_VIEW), validate(listCustomersQuerySchema), listCustomers);

router.get(
  '/customers/:id',
  requireAuth,
  requirePermission(PERMISSION.CUSTOMERS_VIEW),
  validate(customerIdParamSchema, 'params'),
  getCustomer,
);

router.get('/:id', requireAuth, requirePermission(PERMISSION.ORDERS_VIEW), validate(orderIdParamSchema), getOrder);

router.patch(
  '/:id/status',
  requireAuth,
  requirePermission(PERMISSION.ORDERS_WRITE),
  writeLimiter,
  validate(updateOrderStatusSchema),
  setOrderStatus,
);

router.patch(
  '/:id/payment',
  requireAuth,
  requirePermission(PERMISSION.ORDERS_WRITE),
  writeLimiter,
  validate(updatePaymentStatusSchema),
  setOrderPayment,
);

export default router;
