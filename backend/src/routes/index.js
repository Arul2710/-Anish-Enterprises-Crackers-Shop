import { Router } from 'express';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import categoryRoutes from './category.routes.js';
import cartRoutes from './cart.routes.js';
import orderRoutes from './order.routes.js';
import importRoutes from './import.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import settingsRoutes from './settings.routes.js';
import { env } from '../config/env.js';
import { mongoCapabilities } from '../config/db.js';

const router = Router();

/** Liveness plus the facts a developer needs when something looks wrong. */
router.get('/health', (_req, res) => {
  const capabilities = mongoCapabilities();
  res.json({
    success: true,
    data: {
      service: 'anish-enterprises-api',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      database: {
        // Never expose the URI: it can carry credentials.
        name: env.mongoDatabaseName,
        connected: Boolean(capabilities),
        transactions: capabilities ? (capabilities.supportsTransactions ? 'available' : 'unavailable') : 'unknown',
      },
    },
  });
});

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/admin/products/import', importRoutes);
router.use('/admin/dashboard', dashboardRoutes);
router.use('/settings', settingsRoutes);

export default router;
