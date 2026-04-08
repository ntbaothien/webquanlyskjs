import express from 'express';
import { auth } from '../middleware/auth.js';
import { createMomoTopup, createMomoBooking, momoIPN, momoReturn } from '../controllers/paymentController.js';

const router = express.Router();

// ── MoMo Payment ────────────────────────────────────────────────────────────

// Nạp tiền vào ví qua MoMo
router.post('/momo/create', auth, createMomoTopup);

// Mua vé sự kiện qua MoMo
router.post('/momo/book', auth, createMomoBooking);

// IPN callback từ MoMo (public — MoMo gọi trực tiếp, KHÔNG cần auth)
router.post('/momo/ipn', momoIPN);

// Redirect URL sau thanh toán
router.get('/momo/return', momoReturn);

export default router;
