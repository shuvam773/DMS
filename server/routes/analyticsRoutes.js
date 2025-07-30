const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/roleMiddleware');

router.get(
  '/stats',
  verifyToken,analyticsController.getDashboardStats
);

router.get('/charts', verifyToken, analyticsController.getChartsData);

module.exports = router;