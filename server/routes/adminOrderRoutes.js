// routes/adminOrderRoutes.js
const express = require('express');
const router = express.Router();
const adminOrderController = require('../controllers/admin/adminOrderController');
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/roleMiddleware');

// Get all orders (Admin only)
router.get(
  '/',
  verifyToken,
  authorizeRole('admin'),
  adminOrderController.listAllOrders
);

// Get order details (Admin only)
router.get(
  '/:orderId',
  verifyToken,
  authorizeRole('admin'),
  adminOrderController.getOrderDetails
);

module.exports = router;