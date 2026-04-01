/**
 * Global error handler middleware
 */
export const errorHandler = (err, req, res, _next) => {
  console.error('❌ Error:', err.message);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File quá lớn (tối đa 5MB)' });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: messages.join(', ') });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ error: `${field} đã tồn tại` });
  }

  // Mongoose cast error (invalid ID)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'ID không hợp lệ' });
  }

  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Lỗi hệ thống',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
