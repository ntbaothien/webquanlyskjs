import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { role } from '../middleware/role.js';
import { getCoupons, createCoupon, updateCoupon, deleteCoupon, validateCoupon, useCoupon } from '../controllers/couponController.js';

const router = Router();

// Public — validate coupon (requires auth)
router.post('/validate', auth, validateCoupon);
router.post('/use', auth, useCoupon);

// Admin — CRUD coupons
router.get('/', auth, role('ADMIN'), getCoupons);
router.post('/', auth, role('ADMIN'), createCoupon);
router.put('/:id', auth, role('ADMIN'), updateCoupon);
router.delete('/:id', auth, role('ADMIN'), deleteCoupon);

export default router;
