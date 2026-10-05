import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';

const formatIssues = (error) =>
  error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }));

/**
 * Builds an Express middleware from a Zod schema. The parsed value replaces the
 * raw input, so downstream handlers only ever see validated, coerced data.
 */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  try {
    const parsed = schema.parse({ [source]: req[source], query: req.query, params: req.params });
    if (source === 'body') req.body = parsed.body ?? parsed;
    else if (source === 'query') req.validatedQuery = parsed.query ?? parsed;
    else if (source === 'params') req.params = parsed.params ?? parsed;
    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = formatIssues(error);
      return next(
        ApiError.unprocessable('The submitted data is not valid.', {
          code: 'validation_failed',
          details: issues,
        }),
      );
    }
    return next(error);
  }
};

/** Validates a value outside the request cycle (scripts, services). */
export const parseOrThrow = (schema, value, message = 'Invalid value') => {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw ApiError.unprocessable(message, { code: 'validation_failed', details: formatIssues(error) });
    }
    throw error;
  }
};

export default validate;
