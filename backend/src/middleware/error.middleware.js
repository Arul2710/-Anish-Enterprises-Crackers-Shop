import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export const notFoundHandler = (req, _res, next) => {
  next(ApiError.notFound(`No API route matches ${req.method} ${req.originalUrl}`));
};

/** Turns a Mongoose error into an ApiError with the right status. */
const fromMongoose = (error) => {
  if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.values(error.errors).map((entry) => ({ field: entry.path, message: entry.message }));
    return ApiError.unprocessable('The submitted data is not valid.', { code: 'validation_failed', details });
  }
  if (error instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`"${error.value}" is not a valid ${error.path}.`, { code: 'invalid_id' });
  }
  // Duplicate key.
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || 'value';
    return ApiError.conflict(`That ${field} is already in use.`, { code: 'duplicate_key', details: { field } });
  }
  return null;
};

// eslint-disable-next-line no-unused-vars -- Express identifies error middleware by arity.
export const errorHandler = (error, req, res, next) => {
  const mapped = fromMongoose(error);
  const apiError = mapped || (error instanceof ApiError ? error : null);

  if (apiError) {
    if (apiError.status >= 500) {
      logger.error(apiError.message, { path: req.originalUrl, code: apiError.code });
    }
    return res.status(apiError.status).json({
      success: false,
      error: { code: apiError.code, message: apiError.message, ...(apiError.details ? { details: apiError.details } : {}) },
    });
  }

  // Body parser and payload-size failures arrive as generic errors.
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: { code: 'payload_too_large', message: 'That request was too large.' } });
  }
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ success: false, error: { code: 'invalid_json', message: 'The request body is not valid JSON.' } });
  }

  // Anything else is an unexpected fault: log it in full, tell the client nothing.
  logger.error('Unhandled error', {
    path: req.originalUrl,
    method: req.method,
    name: error?.name,
    message: error?.message,
    stack: env.isProduction ? undefined : error?.stack,
  });

  return res.status(500).json({
    success: false,
    error: {
      code: 'internal_error',
      message: 'Something went wrong on our side. Please try again.',
      ...(env.isProduction ? {} : { debug: error?.message }),
    },
  });
};
