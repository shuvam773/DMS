const express = require('express');
const router = express.Router();
const resetProfileController = require('../controllers/resetProfileController');
const verifyToken = require('../middlewares/authMiddleware'); // Assuming you have auth middleware
const authorizeRole = require('../middlewares/roleMiddleware');

// Profile update routes
router.put('/profile', verifyToken, authorizeRole('admin', 'institute', 'pharmacy'), resetProfileController.updateProfile);
router.put('/profile/password', verifyToken, authorizeRole('admin', 'institute', 'pharmacy'), resetProfileController.changePassword);

module.exports = router;