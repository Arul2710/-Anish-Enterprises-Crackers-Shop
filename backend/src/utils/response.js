/**
 * Single success envelope for the whole API so the client never has to guess
 * the shape: { success: true, data, meta? }
 */
import { buildPageMeta } from './pagination.js';

export const sendSuccess = (res, data, { status = 200, meta } = {}) =>
  res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });

export const sendCreated = (res, data, meta) => sendSuccess(res, data, { status: 201, meta });

export const sendNoContent = (res) => res.status(204).send();

/**
 * Standard list envelope. `total` drives the frontend's pagination controls, so
 * it is always included rather than left to be inferred from the page length.
 */
export const sendPaginated = (res, items, { page, pageSize, total, ...extra } = {}) => {
  const size = Number(pageSize) || items.length || 1;
  const count = Number(total) || 0;
  return sendSuccess(res, items, { meta: { ...buildPageMeta({ page: Number(page) || 1, pageSize: size }, count), ...extra } });
};

export default sendSuccess;
