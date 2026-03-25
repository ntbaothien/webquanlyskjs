/**
 * Chuẩn hóa response format cho toàn bộ API
 */

const sendSuccess = (res, data = {}, message = 'OK', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

const sendCreated = (res, data = {}, message = 'Created successfully') => {
  return res.status(201).json({
    success: true,
    data,
    message,
  });
};

const sendError = (res, message = 'Internal server error', statusCode = 500, errorCode = null) => {
  return res.status(statusCode).json({
    success: false,
    error: message,
    code: errorCode || statusCode,
  });
};

const sendNotFound = (res, message = 'Resource not found') => {
  return sendError(res, message, 404);
};

const sendUnauthorized = (res, message = 'Unauthorized') => {
  return sendError(res, message, 401);
};

const sendForbidden = (res, message = 'Forbidden') => {
  return sendError(res, message, 403);
};

const sendBadRequest = (res, message = 'Bad request', errors = null) => {
  const body = {
    success: false,
    error: message,
    code: 400,
  };
  if (errors) body.errors = errors;
  return res.status(400).json(body);
};

module.exports = {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendBadRequest,
};
