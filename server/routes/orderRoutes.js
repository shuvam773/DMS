const express = require('express');
const router = express.Router();
const {
  createOrder,
  getUserOrders,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/orderController');
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/roleMiddleware');

// Create order (pharmacy and institute only)
router.post('/', verifyToken, authorizeRole('pharmacy', 'institute'), createOrder);

// Get user's orders (pharmacy and institute only)
router.get('/my-orders', verifyToken, authorizeRole('pharmacy', 'institute'), getUserOrders);

// Get all orders (admin only)
router.get('/', verifyToken, authorizeRole('admin'), getAllOrders);

// Update order status (admin only)
router.patch('/:orderId/status', verifyToken, authorizeRole('admin'), updateOrderStatus);

module.exports = router;