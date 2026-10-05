import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const here = path.dirname(fileURLToPath(import.meta.url));
export const backendRoot = path.resolve(here, '..', '..');

dotenv.config({ path: path.join(backendRoot, '.env') });

const isProduction = process.env.NODE_ENV === 'production';

/** Comma separated list of allowed browser origins. */
const csvToArray = (value) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((value) =>
    typeof value === 'boolean' ? value : ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase()),
  );

const csv = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => (Array.isArray(value) ? value : csvToArray(value)))
  .pipe(z.array(z.string()));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // Cookies + CORS
  CLIENT_ORIGINS: csv.default('http://localhost:5173,http://127.0.0.1:5173'),
  COOKIE_DOMAIN: z.string().optional(),
  TRUST_PROXY: booleanish.default(false),
  SECURE_COOKIES: booleanish.default(isProduction),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  // The refresh token must outlive the access token, otherwise the refresh
  // cookie silently stops working long before its own maxAge.
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  // Seed admin
  SEED_ADMIN_EMAIL: z.string().email().default('admin@anishenterprises.com'),
  SEED_ADMIN_PASSWORD: z.string().min(10).default(''),
  SEED_ADMIN_NAME: z.string().default('Shop Owner'),

  // Uploads
  UPLOAD_STORAGE: z.enum(['cloudinary', 'memory']).default('memory'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),

  // Excel import price mapping. Intentionally NOT defaulted to a column name:
  // the shop owner must confirm which sheet column is the customer-facing
  // selling price before any product is written. See services/excel.service.js.
  IMPORT_SHEET_NAME: z.string().default('Order'),
  IMPORT_NAME_COLUMN: z.string().default('name'),
  IMPORT_SKU_COLUMN: z.string().default('sku'),
  IMPORT_CATEGORY_COLUMN: z.string().default('category'),
  IMPORT_PACK_COLUMN: z.string().default('pack'),
  IMPORT_SELLING_PRICE_COLUMN: z.string().optional(),
  IMPORT_ORIGINAL_PRICE_COLUMN: z.string().optional(),

  // Store configuration seed
  SHOP_NAME: z.string().default('Anish Enterprises'),
  SHOP_SUPPORT_PHONE: z.string().default('9442521144'),
  SHOP_SUPPORT_EMAIL: z.string().default('anishenterprisessvk@gmail.com'),
  MINIMUM_ORDER_AMOUNT: z.coerce.number().min(0).default(0),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
  // A configuration error must never print a secret value, only the variable name.
  throw new Error(`Invalid backend configuration:\n${details}\n\nCopy .env.example to .env and fill in the missing values.`);
}

const raw = parsed.data;

const cloudinaryConfigured =
  raw.UPLOAD_STORAGE === 'cloudinary' &&
  Boolean(raw.CLOUDINARY_CLOUD_NAME && raw.CLOUDINARY_API_KEY && raw.CLOUDINARY_API_SECRET);

if (raw.UPLOAD_STORAGE === 'cloudinary' && !cloudinaryConfigured) {
  throw new Error(
    'UPLOAD_STORAGE is "cloudinary" but CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET are incomplete.',
  );
}

export const env = Object.freeze({
  ...raw,
  isProduction,
  isTest: raw.NODE_ENV === 'test',
  cloudinaryConfigured,
  mongoDatabaseName: (() => {
    try {
      const name = new URL(raw.MONGODB_URI.replace(/^mongodb(\+srv)?:\/\//, 'http://')).pathname.replace(/^\//, '');
      return name || null;
    } catch {
      return null;
    }
  })(),
});

export default env;
