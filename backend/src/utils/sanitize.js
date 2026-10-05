/**
 * Mongo queries accept a plain object as a filter, which turns any request body
 * field into a query operator. Everything that reaches a query from the client
 * is therefore rebuilt from an explicit allow-list; these helpers strip the
 * dangerous keys and coerce the rest to primitives.
 */

const FORBIDDEN_KEYS = new Set([
  '$where',
  '$expr',
  '$function',
  '$accumulator',
  '$jsonSchema',
  '$comment',
  '$regex',
]);

const MAX_STRING = 500;
const MAX_TEXT = 5000;

export const stripDangerousKeys = (value, depth = 0) => {
  if (depth > 6) return undefined;
  if (Array.isArray(value)) return value.map((entry) => stripDangerousKeys(entry, depth + 1)).filter((entry) => entry !== undefined);
  if (value && typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    const out = {};
    for (const [key, entry] of Object.entries(value)) {
      if (key.startsWith('$')) continue;
      const cleaned = stripDangerousKeys(entry, depth + 1);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    return out;
  }
  return value;
};

/** Turns request input into trimmed primitives, dropping empty values. */
export const cleanString = (value, { max = MAX_STRING, allowEmpty = false } = {}) => {
  if (value === null || value === undefined) return allowEmpty ? '' : undefined;
  const text = String(value).trim().replace(/\s+/g, ' ');
  if (!text) return allowEmpty ? '' : undefined;
  return text.slice(0, max);
};

export const cleanText = (value) => {
  const text = cleanString(value, { max: MAX_TEXT, allowEmpty: true });
  return text || '';
};

export const cleanEmail = (value) => {
  const text = cleanString(value, { max: 254 });
  if (!text) return undefined;
  const lowered = text.toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lowered) ? lowered : undefined;
};

export const cleanPhone = (value) => {
  const text = cleanString(value, { max: 32 });
  if (!text) return undefined;
  // Keep digits and the separators people actually type.
  const phone = text.replace(/[^\d+()\-\s]/g, '');
  return /[\d]{6,}/.test(phone) ? phone : undefined;
};

export const cleanUrl = (value) => {
  const text = cleanString(value, { max: 2048 });
  if (!text) return undefined;
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};

export const cleanNumber = (value, { min = 0, max = Number.MAX_SAFE_INTEGER, integer = false } = {}) => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  const clamped = Math.min(max, Math.max(min, parsed));
  return integer ? Math.round(clamped) : clamped;
};

export const cleanBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (value === null || value === undefined || value === '') return undefined;
  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(text)) return true;
  if (['0', 'false', 'no', 'off'].includes(text)) return false;
  return undefined;
};

/** Escapes a user string for safe use inside a RegExp. */
export const safePattern = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 80);

export { FORBIDDEN_KEYS };
