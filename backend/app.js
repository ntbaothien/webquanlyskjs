require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./src/config/env');
const { sendError, sendSuccess } = require('./src/utils/response');

const app = express();

// ===== Security Middlewares =====
app.use(helmet());

app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting — tổng thể
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 200,
  message: { success: false, error: 'Quá nhiều request, vui lòng thử lại sau', code: 429 },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

// ===== Body Parsers =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== Logging =====
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
}

// ===== Health Check =====
app.get('/health', (req, res) => {
  sendSuccess(res, {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  }, 'EventHub API is running 🚀');
});

// ===== API Routes =====
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/users', require('./src/routes/user.routes'));
app.use('/api/events', require('./src/routes/event.routes'));
app.use('/api/ticket-types', require('./src/routes/ticketType.routes'));
app.use('/api/orders', require('./src/routes/order.routes'));
app.use('/api/payments', require('./src/routes/payment.routes'));
app.use('/api/tickets', require('./src/routes/ticket.routes').router);
app.use('/api/discounts', require('./src/routes/discount.routes'));
app.use('/api/notifications', require('./src/routes/notification.routes'));
app.use('/api/admin', require('./src/routes/admin.routes'));

// Nested routes (event sub-resources)
const ticketTypeRouter = require('./src/routes/ticketType.routes');
const seatRouter = require('./src/routes/seat.routes');
const reviewRouter = require('./src/routes/review.routes');
const checkinRouter = require('./src/routes/checkin.routes');

app.use('/api/events/:eventId/ticket-types', ticketTypeRouter);
app.use('/api/events/:eventId/seats', seatRouter);
app.use('/api/seats', seatRouter);
app.use('/api/events/:eventId/reviews', reviewRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/events/:eventId/checkins', checkinRouter);
app.use('/api/checkin', checkinRouter);

// ===== 404 Handler =====
app.use('*', (req, res) => {
  sendError(res, `Route ${req.method} ${req.originalUrl} không tồn tại`, 404);
});

// ===== Global Error Handler =====
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return sendError(res, errors.join(', '), 400);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return sendError(res, `${field} đã tồn tại`, 409);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Token không hợp lệ', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token đã hết hạn', 401);
  }

  sendError(res, err.message || 'Lỗi máy chủ nội bộ', err.status || 500);
});

module.exports = app;
