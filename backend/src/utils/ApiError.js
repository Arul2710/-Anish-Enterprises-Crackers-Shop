/**
 * Error type carrying an HTTP status and a stable machine code. Anything thrown
 * that is not an ApiError is treated as an unexpected fault and reported as a
 * generic 500 so internals never reach the client.
 */
export class ApiError extends Error {
  constructor(status, message, { code = 'error', details = null, cause } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.expected = true;
    if (cause) this.cause = cause;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = 'Bad request', options) {
    return new ApiError(400, message, { code: 'bad_request', ...options });
  }

  static unauthorized(message = 'Authentication required', options) {
    return new ApiError(401, message, { code: 'unauthorized', ...options });
  }

  static forbidden(message = 'You do not have access to this resource', options) {
    return new ApiError(403, message, { code: 'forbidden', ...options });
  }

  static notFound(message = 'Resource not found', options) {
    return new ApiError(404, message, { code: 'not_found', ...options });
  }

  static conflict(message = 'Conflicting request', options) {
    return new ApiError(409, message, { code: 'conflict', ...options });
  }

  static unprocessable(message = 'Validation failed', options) {
    return new ApiError(422, message, { code: 'validation_failed', ...options });
  }

  static tooMany(message = 'Too many requests', options) {
    return new ApiError(429, message, { code: 'rate_limited', ...options });
  }
}

export default ApiError;
