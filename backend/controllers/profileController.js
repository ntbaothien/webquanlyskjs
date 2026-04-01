import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Event from '../models/Event.js';

/**
 * GET /api/profile
 */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -twoFA');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/profile
 */
export const updateProfile = async (req, res) => {
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
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/profile/password
 */
export const changePassword = async (req, res) => {
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
 * GET /api/profile/saved-events
 */
export const getSavedEvents = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('savedEvents');
    res.json(user.savedEvents || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/profile/saved-events/:eventId — toggle save/unsave
 */
export const toggleSaveEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Sự kiện không tồn tại' });

    const user = await User.findById(req.user._id);
    const index = user.savedEvents.indexOf(eventId);

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
