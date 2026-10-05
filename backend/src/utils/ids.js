import crypto from 'node:crypto';

const SAFE_SEGMENT = /[^a-z0-9]+/g;

export const slugify = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(SAFE_SEGMENT, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';

/** Human-facing order reference, e.g. AE-2026-000123. */
export const buildOrderReference = (sequence, now = new Date()) => {
  const year = now.getFullYear();
  return `AE-${year}-${String(sequence).padStart(6, '0')}`;
};

/**
 * Sequential, gap-free order reference. A dedicated counters document is
 * incremented with findOneAndUpdate so two concurrent orders can never be
 * handed the same number, and it works without transactions.
 */
export const nextOrderSequence = async (Order, { session } = {}) => {
  const year = new Date().getFullYear();
  const counter = await Order.collection.findOneAndUpdate(
    { _id: `order-seq-${year}` },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: 'after', session, projection: { value: 1 } },
  );
  return counter?.value ?? 1;
};

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

export const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

/** Timing-safe compare for opaque tokens. */
export const safeEqual = (a, b) => {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

/** A Mongo ObjectId or our own string id - lets legacy ids keep working. */
export const isValidObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || ''));

export const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
