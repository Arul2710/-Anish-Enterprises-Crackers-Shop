import { Router } from 'express';
import { catalogue, customers, orders, report, stock, summary } from '../controllers/dashboard.controller.js';
import { requireAuth, requirePermission } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { PERMISSION } from '../config/constants.js';
import { listOrdersQuerySchema } from '../validators/order.validator.js';
import { listProductsQuerySchema } from '../validators/product.validator.js';

const router = Router();

/** The whole dashboard is admin-only. */
router.use(requireAuth);

router.get('/summary', requirePermission(PERMISSION.REPORTS_VIEW), summary);
router.get('/report', requirePermission(PERMISSION.REPORTS_VIEW), report);
router.get('/low-stock', requirePermission(PERMISSION.INVENTORY_WRITE), stock);
router.get('/catalogue', requirePermission(PERMISSION.PRODUCTS_VIEW), validate(listProductsQuerySchema), catalogue);
router.get('/orders', requirePermission(PERMISSION.ORDERS_VIEW), validate(listOrdersQuerySchema), orders);
router.get('/customers', requirePermission(PERMISSION.CUSTOMERS_VIEW), customers);

export default router;
