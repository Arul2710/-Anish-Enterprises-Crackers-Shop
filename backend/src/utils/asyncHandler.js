/**
 * Wraps an async route handler so a rejected promise reaches the Express error
 * middleware instead of hanging the request.
 */
export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export default asyncHandler;
