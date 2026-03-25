const { verifyAccessToken } = require('../utils/jwtHelper');
const { sendUnauthorized } = require('../utils/response');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendUnauthorized(res, 'Vui lòng đăng nhập để tiếp tục');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return sendUnauthorized(res, 'Token không tồn tại');
    }

    // Verify JWT
    const decoded = verifyAccessToken(token);

    // Lấy user từ DB (kiểm tra tồn tại & active)
    const user = await User.findById(decoded.userId).select('-passwordHash');

    if (!user) {
      return sendUnauthorized(res, 'Tài khoản không tồn tại');
    }

    if (!user.isActive) {
      return sendUnauthorized(res, 'Tài khoản đã bị vô hiệu hóa');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendUnauthorized(res, 'Token đã hết hạn, vui lòng đăng nhập lại');
    }
    if (error.name === 'JsonWebTokenError') {
      return sendUnauthorized(res, 'Token không hợp lệ');
    }
    next(error);
  }
};

module.exports = authMiddleware;
