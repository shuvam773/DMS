const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrder,
  listOrders,
  updateOrderStatus,
} = require('../controllers/orderController');
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/roleMiddleware');

// Create a new order
router.post('/', verifyToken, createOrder);

// Get order details
router.get('/:orderId', verifyToken, getOrder);

// List user's orders
router.get('/', verifyToken, listOrders);

// Update order status (admin/seller)
router.patch(
  '/:orderId/status',
  verifyToken,
  authorizeRole(['admin', 'institute']),
  updateOrderStatus
);

module.exports = router;
