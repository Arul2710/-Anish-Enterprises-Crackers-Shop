/**
 * Creates the first owner account. There is deliberately no public admin
 * registration, so this script is the only way the shop gets its first login.
 *
 * Safe to re-run: if the account already exists the password is left alone
 * unless --reset-password is passed.
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { Admin } from '../models/Admin.js';
import { getSettings } from '../services/settings.service.js';
import { logger } from '../utils/logger.js';

const args = new Set(process.argv.slice(2));
const resetPassword = args.has('--reset-password');

const run = async () => {
  if (!env.SEED_ADMIN_PASSWORD) {
    throw new Error('SEED_ADMIN_PASSWORD is not set. Copy .env.example to .env and set it first.');
  }

  await connectDatabase();

  const email = env.SEED_ADMIN_EMAIL.toLowerCase();
  const existing = await Admin.findOne({ email }).select('+passwordHash');

  if (existing && !resetPassword) {
    logger.info('seed admin already exists, leaving the password unchanged', {
      email,
      role: existing.role,
    });
  } else {
    const passwordHash = await Admin.hashPassword(env.SEED_ADMIN_PASSWORD);
    if (existing) {
      existing.passwordHash = passwordHash;
      existing.passwordChangedAt = new Date();
      // Force every existing session to re-authenticate with the new password.
      existing.tokenVersion = (existing.tokenVersion || 0) + 1;
      existing.sessionRevocations = [];
      existing.isActive = true;
      await existing.save();
      logger.info('seed admin password reset', { email });
    } else {
      await Admin.create({
        name: env.SEED_ADMIN_NAME,
        email,
        passwordHash,
        role: 'owner',
        isActive: true,
      });
      logger.info('seed admin created', { email, role: 'owner' });
    }
  }

  // Creating the settings singleton here means the shop profile exists before
  // the first request rather than being created lazily mid-request.
  const settings = await getSettings();
  logger.info('shop settings ready', { shopName: settings.shopName, key: settings.key });

  const admins = await Admin.find({}).select('email role isActive createdAt').lean();
  logger.info('admin accounts', { count: admins.length });
  for (const admin of admins) {
    logger.info('  -', { email: admin.email, role: admin.role, isActive: admin.isActive });
  }

  logger.info('done. Start the API with: npm run dev');
};

run()
  .catch((error) => {
    logger.error('seed failed', { message: error.message });
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase().catch(() => {});
    await mongoose.disconnect().catch(() => {});
  });
