import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';

/**
 * GET /api/users/me
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -twoFA');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/users/me — update profile
 */
export const updateMe = async (req, res) => {
  try {
    const { fullName, phone } = req.body;
    const updates = {};
    if (fullName) updates.fullName = fullName;
    if (phone !== undefined) updates.phone = phone;
    if (req.file) {
      updates.avatarUrl = `/uploads/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true })
      .select('-password -twoFA');

    // Return format frontend expects: { data: user }
    res.json({ data: user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/users/me/password
 */
export const changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mật khẩu' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/users/me/stats
 */
export const getMyStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [registrations, bookings, eventsCreated, reviews, user] = await Promise.all([
      Registration.countDocuments({ userId }),
      Booking.countDocuments({ userId }),
      Event.countDocuments({ organizerId: userId }),
      Review.countDocuments({ userId }),
      User.findById(userId).select('balance').lean()
    ]);

    res.json({
      registrations,
      bookings,
      eventsCreated,
      reviews,
      balance: user?.balance || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/users/me/saved
 */
export const getMySaved = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('savedEvents');
    res.json({ data: user.savedEvents || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/users/me/saved/:eventId — toggle save
 */
export const toggleSaveEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Sự kiện không tồn tại' });

    const user = await User.findById(req.user._id);
    const index = user.savedEvents.findIndex(id => id.toString() === eventId);

    if (index > -1) {
      user.savedEvents.splice(index, 1);
      await user.save();
      res.json({ saved: false, message: 'Đã bỏ lưu sự kiện' });
    } else {
      user.savedEvents.push(eventId);
      await user.save();
      res.json({ saved: true, message: 'Đã lưu sự kiện' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/users/me/saved/:eventId — unsave
 */
export const unsaveEvent = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { savedEvents: req.params.eventId }
    });
    res.json({ message: 'Đã bỏ lưu sự kiện' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
