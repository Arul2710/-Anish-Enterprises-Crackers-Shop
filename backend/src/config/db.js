import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let cachedCapabilities = null;

/**
 * Standalone mongod cannot run multi-document transactions. Detect the topology
 * once so the order service can pick the correct stock-reservation strategy
 * instead of failing at commit time.
 */
export const detectMongoCapabilities = async () => {
  if (cachedCapabilities) return cachedCapabilities;
  try {
    const admin = mongoose.connection.db.admin();
    const info = await admin.command({ hello: 1 });
    const isReplicaSet = Boolean(info.setName) || info.msg === 'isdbgrid';
    cachedCapabilities = {
      isReplicaSet,
      isAtlas: String(info.msg || '').includes('isdbgrid') || Boolean(info.setName?.includes('atlas')),
      maxWireVersion: info.maxWireVersion || 0,
      supportsTransactions: isReplicaSet,
    };
  } catch (error) {
    cachedCapabilities = { isReplicaSet: false, isAtlas: false, maxWireVersion: 0, supportsTransactions: false, error: error.message };
  }
  return cachedCapabilities;
};

export const mongoCapabilities = () => cachedCapabilities;

export const connectDatabase = async () => {
  mongoose.set('strictQuery', true);
  // Reject unknown query operators instead of silently ignoring them.
  mongoose.set('sanitizeFilter', true);

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 20,
    autoIndex: !env.isProduction,
  });

  const capabilities = await detectMongoCapabilities();
  logger.info('MongoDB connected', {
    database: mongoose.connection.name,
    replicaSet: capabilities.isReplicaSet,
    transactions: capabilities.supportsTransactions ? 'available' : 'unavailable (using guarded atomic updates)',
  });

  mongoose.connection.on('error', (error) => logger.error('MongoDB connection error', { message: error.message }));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  return mongoose.connection;
};

export const disconnectDatabase = async () => {
  await mongoose.connection.close();
  cachedCapabilities = null;
};

export default connectDatabase;
