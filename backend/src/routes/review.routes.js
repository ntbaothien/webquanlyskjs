const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middlewares/auth.middleware');
const Review = require('../models/Review');
const CheckIn = require('../models/CheckIn');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest, sendForbidden } = require('../utils/response');
const { paginate, paginateResponse } = require('../utils/pagination');

// GET /api/events/:eventId/reviews
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const [reviews, total] = await Promise.all([
      Review.find({ eventId: req.params.eventId })
        .populate('userId', 'fullName avatar')
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      Review.countDocuments({ eventId: req.params.eventId }),
    ]);
    // Tính rating trung bình
    const avgResult = await Review.aggregate([
      { $match: { eventId: require('mongoose').Types.ObjectId.createFromHexString(req.params.eventId) } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const avgRating = avgResult[0]?.avgRating?.toFixed(1) || 0;

    sendSuccess(res, { ...paginateResponse(reviews, total, page, limit), avgRating });
  } catch (err) { next(err); }
});

// POST /api/events/:eventId/reviews
router.post('/', auth, async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    if (!rating) return sendBadRequest(res, 'Rating là bắt buộc');

    // Kiểm tra đã check-in event chưa
    const hasCheckedIn = await CheckIn.findOne({ eventId: req.params.eventId, userId: req.user._id });

    const review = await Review.create({
      eventId: req.params.eventId,
      userId: req.user._id,
      rating,
      comment,
      isVerifiedAttendee: !!hasCheckedIn,
    });
    await review.populate('userId', 'fullName avatar');
    sendCreated(res, review, 'Đánh giá của bạn đã được ghi nhận');
  } catch (err) {
    if (err.code === 11000) return sendBadRequest(res, 'Bạn đã đánh giá sự kiện này rồi');
    next(err);
  }
});

// PUT /api/reviews/:id
router.put('/:id', auth, async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return sendNotFound(res, 'Đánh giá không tồn tại');
    if (review.userId.toString() !== req.user._id.toString()) {
      return sendForbidden(res, 'Bạn không có quyền sửa đánh giá này');
    }
    const updated = await Review.findByIdAndUpdate(
      req.params.id,
      { rating: req.body.rating, comment: req.body.comment },
      { new: true, runValidators: true }
    ).populate('userId', 'fullName avatar');
    sendSuccess(res, updated, 'Đã cập nhật đánh giá');
  } catch (err) { next(err); }
});

// DELETE /api/reviews/:id
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return sendNotFound(res, 'Đánh giá không tồn tại');
    if (review.userId.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return sendForbidden(res, 'Bạn không có quyền xóa đánh giá này');
    }
    await Review.findByIdAndDelete(req.params.id);
    sendSuccess(res, {}, 'Đã xóa đánh giá');
  } catch (err) { next(err); }
});

module.exports = router;
