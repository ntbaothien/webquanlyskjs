const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const User = require('../models/User');
const UserOTP = require('../models/UserOTP');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwtHelper');
const { sendSuccess, sendCreated, sendError, sendBadRequest, sendUnauthorized } = require('../utils/response');
const authMiddleware = require('../middlewares/auth.middleware');

// Rate limit nghiêm ngặt cho auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Quá nhiều lần thử, vui lòng đợi 15 phút', code: 429 },
});

// ============================================================
// POST /api/auth/register
// ============================================================
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { fullName, email, password, phone } = req.body;

    if (!fullName || !email || !password) {
      return sendBadRequest(res, 'Họ tên, email và mật khẩu là bắt buộc');
    }

    if (password.length < 6) {
      return sendBadRequest(res, 'Mật khẩu phải ít nhất 6 ký tự');
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return sendError(res, 'Email đã được sử dụng', 409);
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      passwordHash,
      phone,
    });

    const accessToken = generateAccessToken({ userId: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user._id });

    return sendCreated(res, {
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken,
    }, 'Đăng ký thành công');
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/auth/login
// ============================================================
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendBadRequest(res, 'Email và mật khẩu là bắt buộc');
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

    if (!user) {
      return sendUnauthorized(res, 'Email hoặc mật khẩu không đúng');
    }

    if (!user.isActive) {
      return sendUnauthorized(res, 'Tài khoản đã bị vô hiệu hóa');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return sendUnauthorized(res, 'Email hoặc mật khẩu không đúng');
    }

    // Nếu 2FA đang bật — trả về trạng thái yêu cầu OTP
    if (user.is2FAEnabled) {
      // Sinh OTP 6 số và lưu vào DB
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiredAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

      await UserOTP.create({ userId: user._id, code: otp, expiredAt });
      // TODO: Gửi OTP qua email: emailService.sendOTP(user.email, otp)
      console.log(`[2FA] OTP for ${user.email}: ${otp}`); // Tạm log, sau dùng email

      return sendSuccess(res, {
        requires2FA: true,
        userId: user._id,
      }, 'Vui lòng nhập mã OTP đã gửi đến email của bạn');
    }

    const accessToken = generateAccessToken({ userId: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user._id });

    return sendSuccess(res, {
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        is2FAEnabled: user.is2FAEnabled,
      },
      accessToken,
      refreshToken,
    }, 'Đăng nhập thành công');
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/auth/2fa/verify
// ============================================================
router.post('/2fa/verify', authLimiter, async (req, res, next) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return sendBadRequest(res, 'userId và mã OTP là bắt buộc');
    }

    const otp = await UserOTP.findOne({
      userId,
      code,
      isUsed: false,
      expiredAt: { $gt: new Date() },
    });

    if (!otp) {
      return sendUnauthorized(res, 'Mã OTP không hợp lệ hoặc đã hết hạn');
    }

    // Đánh dấu đã dùng
    otp.isUsed = true;
    await otp.save();

    const user = await User.findById(userId);
    if (!user) return sendUnauthorized(res, 'Người dùng không tồn tại');

    const accessToken = generateAccessToken({ userId: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user._id });

    return sendSuccess(res, {
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken,
    }, 'Xác thực 2FA thành công');
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/auth/2fa/enable — Bật 2FA (cần đăng nhập)
// ============================================================
router.post('/2fa/enable', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { is2FAEnabled: true },
      { new: true }
    );

    return sendSuccess(res, { is2FAEnabled: user.is2FAEnabled }, '2FA đã được bật');
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/auth/refresh-token
// ============================================================
router.post('/refresh-token', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendBadRequest(res, 'Refresh token là bắt buộc');
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return sendUnauthorized(res, 'Tài khoản không hợp lệ');
    }

    const newAccessToken = generateAccessToken({ userId: user._id, role: user.role });

    return sendSuccess(res, { accessToken: newAccessToken }, 'Token đã được làm mới');
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendUnauthorized(res, 'Refresh token đã hết hạn, vui lòng đăng nhập lại');
    }
    next(error);
  }
});

// ============================================================
// POST /api/auth/logout
// ============================================================
router.post('/logout', authMiddleware, (req, res) => {
  // TODO: Blacklist token với Redis: redisClient.setex(token, 900, 'blacklisted')
  return sendSuccess(res, {}, 'Đăng xuất thành công');
});

module.exports = router;
