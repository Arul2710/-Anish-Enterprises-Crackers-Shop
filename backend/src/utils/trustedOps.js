import mongoose from 'mongoose';

/**
 * Marks a filter value as application-authored so `sanitizeFilter` leaves it
 * alone.
 *
 * `sanitizeFilter` (enabled in `config/db.js`) rewrites any filter value that
 * contains a `$`-prefixed key into `{ $eq: <original> }`, which neutralises
 * query-selector injection from user input. It does not distinguish our own
 * operators from an attacker's, so a legitimate `{ $in: [...] }` or
 * `{ $gte: ... }` is wrapped too and Mongoose then fails with a CastError.
 *
 * Wrapping the *value* in `mongoose.trusted()` opts that one value out while
 * every other key in the same filter is still sanitized. Only use it for
 * operators this codebase builds itself, never for values that reached us from
 * a request.
 */
export const trustedOps = (value) => mongoose.trusted(value);

export default trustedOps;
