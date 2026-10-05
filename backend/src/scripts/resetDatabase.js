/**
 * Clears shop data for a clean re-import or a fresh demo.
 *
 * This is destructive, so it is deliberately hard to run by accident:
 *  - refuses to run when NODE_ENV=production
 *  - refuses to run without an explicit --confirm
 *  - prints what it is about to delete, and keeps the admin accounts and the
 *    shop settings, because losing the login or the shop profile is never what
 *    someone resetting a catalogue wants
 *
 * Usage:
 *   npm run db:reset -- --confirm
 *   npm run db:reset -- --confirm --include-orders
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDatabase, disconnectDatabase, mongoCapabilities } from '../config/db.js';
import { Admin } from '../models/Admin.js';
import { Category } from '../models/Category.js';
import { Cart } from '../models/Cart.js';
import { Customer } from '../models/Customer.js';
import { ImportLog } from '../models/ImportLog.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { logger } from '../utils/logger.js';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);

/** Cleared by default: everything a catalogue re-import would rebuild. */
const DEFAULT_TARGETS = [
  ['products', Product],
  ['categories', Category],
  ['importlogs', ImportLog],
];

/** Only wiped when explicitly asked for, since orders are real customer records. */
const OPTIONAL_TARGETS = [
  ['customers', Customer],
  ['carts', Cart],
  ['orders', Order],
];

const run = async () => {
  if (env.isProduction) {
    throw new Error('Refusing to reset a production database. Set NODE_ENV to development first.');
  }
  if (!flag('--confirm')) {
    logger.error('refusing to run without --confirm', {
      hint: 'this permanently deletes catalogue data. re-run with --confirm when you are sure',
      database: env.mongoDatabaseName,
    });
    process.exitCode = 1;
    return;
  }

  const targets = flag('--include-orders') ? [...DEFAULT_TARGETS, ...OPTIONAL_TARGETS] : DEFAULT_TARGETS;

  await connectDatabase();
  const capabilities = mongoCapabilities();

  for (const [name, Model] of targets) {
    // countDocuments first so the operator sees the size of what goes.
    const { count } = await Model.countDocuments();
    logger.info('about to clear', { collection: name, documents: count });
  }
  logger.info('kept', {
    admins: await Admin.countDocuments(),
    note: 'admin accounts and shop settings are never touched by this script',
    transactions: capabilities?.supportsTransactions ? 'available' : 'unavailable (guarded atomic fallback in use)',
  });

  for (const [name, Model] of targets) {
    const result = await Model.deleteMany({});
    logger.info('cleared', { collection: name, deleted: result.deletedCount ?? result.acknowledged });
  }

  logger.info('done', { database: env.mongoDatabaseName, next: 'run the import to rebuild the catalogue' });
};

run()
  .catch((error) => {
    logger.error('reset failed', { message: error.message });
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
  });
