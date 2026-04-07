import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  createGroupBuy,
  getGroupBuyInfo,
  joinGroupBuy,
  cancelGroupBuy
} from '../controllers/groupBuyController.js';

const router = express.Router();

// Tạo nhóm mua vé (host)
router.post('/', auth, createGroupBuy);

// Xem thông tin nhóm mua theo mã mời
router.get('/:inviteCode', getGroupBuyInfo);

// Thành viên tham gia & thanh toán phần của mình
router.post('/:inviteCode/join', auth, joinGroupBuy);

// Host hủy nhóm mua
router.delete('/:inviteCode', auth, cancelGroupBuy);

export default router;
