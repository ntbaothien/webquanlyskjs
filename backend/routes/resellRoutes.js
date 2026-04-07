import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  listResellMarket,
  createListing,
  cancelListing,
  buyResellTicket,
  getMyListings
} from '../controllers/resellController.js';

const router = express.Router();

// Public: xem chợ bán vé
router.get('/', listResellMarket);

// Private: người dùng đã đăng nhập
router.post('/', auth, createListing);               // Treo vé lên chợ
router.get('/my', auth, getMyListings);              // Xem vé mình đang treo
router.delete('/:id', auth, cancelListing);          // Xóa khỏi chợ
router.post('/:id/buy', auth, buyResellTicket);      // Mua vé trên chợ

export default router;
