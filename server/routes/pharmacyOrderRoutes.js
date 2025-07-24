const express = require('express');
const router = express.Router();
const pharmacyOrderController = require('../controllers/pharmacyAdmin/pharmacyOrderController');
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/roleMiddleware');

// Create a new pharmacy order (Pharmacy only)
router.post(
  '/',
  verifyToken,
  authorizeRole('pharmacy'),
  pharmacyOrderController.createPharmacyOrder
);


router.get(
  '/orders/history',
  verifyToken,
  authorizeRole('pharmacy', 'institute', 'admin'),
  pharmacyOrderController.listPharmacyOrderHistory
);

router.get(
  '/history/:orderId',
  verifyToken,
  authorizeRole('pharmacy', 'institute', 'admin'),
  pharmacyOrderController.getPharmacyOrderHistoryDetails
);


module.exports = router;