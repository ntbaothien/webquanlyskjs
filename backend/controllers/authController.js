import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendResetPasswordEmail } from '../utils/mailer.js';
import crypto from 'crypto';

/**
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email đã được sử dụng' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'ATTENDEE',
      balance: 0 // 0 VND default
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        balance: user.balance
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }

    if (user.isLocked) {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa. Liên hệ admin để được hỗ trợ.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    res.json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        balance: user.balance
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/auth/forgot-password
 * Request password reset token via email
 */

export const forgotPassword = async (req, res) => {
  console.log('🔴 forgotPassword called:', new Date().toISOString());
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Vui lòng nhập email' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists (security best practice)
      return res.json({
        message: 'Nếu email tồn tại, bạn sẽ nhận được email đặt lại mật khẩu'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Debug logging
    console.log(`\n📧 Forgot Password - Saving Token:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Reset token (plain): ${resetToken}`);
    console.log(`  Hashed token: ${hashedToken}`);

    // Set token and expiry (30 minutes)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000;
    console.log(`  Expiry time: ${new Date(user.resetPasswordExpires).toISOString()}`);
    
    const savedUser = await user.save();
    
    // Verify token was saved
    const verifyUser = await User.findOne({ resetPasswordToken: hashedToken });
    if (verifyUser) {
      console.log(`  ✅ Token saved successfully to DB`);
      console.log(`  Saved in DB: ${verifyUser.resetPasswordToken}`);
      console.log(`  Match: ${verifyUser.resetPasswordToken === hashedToken ? '✅' : '❌'}`);
    } else {
      console.log(`  ❌ ERROR: Token NOT saved to DB!`);
      // Check what's in DB for this user
      const userInDB = await User.findOne({ email: email.toLowerCase() });
      console.log(`  User token in DB: ${userInDB?.resetPasswordToken || 'null'}`);
    }
    console.log();

    // Build reset URL
    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    // Log token cho development
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔐 RESET PASSWORD TOKEN (Development Only)`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\n📋 Copy token này vào trang forgot-password:\n`);
    console.log(`${resetToken}\n`);
    console.log(`📧 Hoặc sử dụng link:\n${resetURL}\n`);
    console.log(`${'='.repeat(60)}\n`);

    // Send email
    try {
      await sendResetPasswordEmail(user.email, resetURL, user.fullName);
    } catch (emailError) {
      // Clear reset token if email fails
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();

      console.error('Email send error:', emailError);
      return res.status(500).json({
        error: 'Không thể gửi email. Vui lòng thử lại sau.'
      });
    }

    res.json({
      message: 'Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư của bạn.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/auth/reset-password/:token
 * Reset password with token
 */
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    // Normalize token
    const normalizedToken = token.trim();
    
    // Debug logging
    console.log(`\n🔍 Reset Password Debug:`);
    console.log(`  Token from URL: ${token}`);
    console.log(`  Normalized: ${normalizedToken}`);
    console.log(`  Length: ${normalizedToken.length}`);

    if (!password || !confirmPassword) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin mật khẩu' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Mật khẩu xác nhận không khớp' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    // Hash the token for comparison
    const hashedToken = crypto.createHash('sha256').update(normalizedToken).digest('hex');
    console.log(`  Hashed token: ${hashedToken}`);

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      // Debug: check if token exists at all (even expired)
      const anyUser = await User.findOne({ resetPasswordToken: hashedToken });
      console.log(`  ❌ User not found or token expired`);
      console.log(`  Token exists in DB: ${!!anyUser}`);
      if (anyUser) {
        console.log(`  Token expiry: ${anyUser.resetPasswordExpires}`);
        console.log(`  Current time: ${new Date().toISOString()}`);
      } else {
        // Check all users to see what tokens are stored
        const allUsers = await User.find({ resetPasswordToken: { $ne: null } });
        console.log(`  Users with reset tokens: ${allUsers.length}`);
        if (allUsers.length > 0) {
          console.log(`  Stored token (first user): ${allUsers[0].resetPasswordToken}`);
          console.log(`  Trying to match: ${hashedToken}`);
          console.log(`  Match: ${allUsers[0].resetPasswordToken === hashedToken}`);
        }
      }
      return res.status(400).json({
        error: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu một cái mới.'
      });
    }

    console.log(`  ✅ User found: ${user.email}`);

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Clear reset token
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    console.log(`  ✅ Password updated successfully\n`);

    res.json({
      message: 'Mật khẩu của bạn đã được đặt lại thành công. Vui lòng đăng nhập với mật khẩu mới.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
