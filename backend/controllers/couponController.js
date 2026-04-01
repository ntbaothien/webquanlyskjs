import Coupon from '../models/Coupon.js';

/**
 * GET /api/admin/coupons
 */
export const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    res.json(coupons.map(c => ({ ...c, id: c._id })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/admin/coupons
 */
export const createCoupon = async (req, res) => {
  try {
    const { code, description, discountType, discountValue, maxUses, minOrderAmount, maxDiscount, eventId, validFrom, validTo } = req.body;
    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      description,
      discountType: discountType || 'PERCENT',
      discountValue: parseFloat(discountValue),
      maxUses: parseInt(maxUses) || 0,
      minOrderAmount: parseFloat(minOrderAmount) || 0,
      maxDiscount: parseFloat(maxDiscount) || 0,
      eventId: eventId || null,
      validFrom: validFrom || new Date(),
      validTo
    });
    res.status(201).json(coupon);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Mã coupon đã tồn tại' });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/admin/coupons/:id
 */
export const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!coupon) return res.status(404).json({ error: 'Không tìm thấy coupon' });
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/admin/coupons/:id
 */
export const deleteCoupon = async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Xóa coupon thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/coupons/validate — validate coupon code and return discount info
 */
export const validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount, eventId } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

    if (!coupon) return res.status(400).json({ error: 'Mã giảm giá không hợp lệ' });

    const now = new Date();
    if (now < new Date(coupon.validFrom)) return res.status(400).json({ error: 'Mã giảm giá chưa có hiệu lực' });
    if (now > new Date(coupon.validTo)) return res.status(400).json({ error: 'Mã giảm giá đã hết hạn' });
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return res.status(400).json({ error: 'Mã giảm giá đã hết lượt sử dụng' });
    if (coupon.eventId && coupon.eventId.toString() !== eventId) return res.status(400).json({ error: 'Mã giảm giá không áp dụng cho sự kiện này' });
    if (orderAmount && orderAmount < coupon.minOrderAmount) return res.status(400).json({ error: `Đơn hàng tối thiểu ${coupon.minOrderAmount.toLocaleString('vi-VN')}đ` });

    let discount = 0;
    if (coupon.discountType === 'PERCENT') {
      discount = (orderAmount || 0) * (coupon.discountValue / 100);
      if (coupon.maxDiscount > 0 && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.discountValue;
    }

    res.json({
      valid: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        description: coupon.description
      },
      discount: Math.round(discount)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/coupons/use — increment usage count (called after successful booking)
 */
export const useCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    await Coupon.findOneAndUpdate({ code: code.toUpperCase() }, { $inc: { usedCount: 1 } });
    res.json({ message: 'ok' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
