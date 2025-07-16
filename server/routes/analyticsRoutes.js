const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/roleMiddleware');

router.get(
  '/stats',
  verifyToken,
  authorizeRole('admin', 'institute', 'pharmacy'),
  analyticsController.getDashboardStats
);

module.exports = router;