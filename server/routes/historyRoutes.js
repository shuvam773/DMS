const express = require('express');
const router = express.Router();
const orderHistoryController = require('../controllers/orderHistoryController');
const authMiddleware = require('../middlewares/authMiddleware');

// Get order history with filters
router.get('/', authMiddleware, orderHistoryController.listOrderHistory);

// Get specific order details
router.get('/:orderId', authMiddleware, orderHistoryController.getOrderHistoryDetails);

module.exports = router;