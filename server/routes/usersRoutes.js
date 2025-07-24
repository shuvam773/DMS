const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const pharmacyController = require('../controllers/instituteAdmin/pharmacyController');
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/roleMiddleware');

// Admin/Institute User Management Routes
// --------------------------------------------------

// Create a new institute (Admin only)
router.post(
  '/',
  verifyToken,
  authorizeRole('admin'),
  userController.createUser
);

// Get all institutes
router.get(
  '/',
  verifyToken,
  authorizeRole('admin', 'institute', 'pharmacy'),
  userController.getAllUsers
);

// Get single institute by ID (Admin only)
router.get(
  '/:id',
  verifyToken,
  authorizeRole('admin', 'institute', 'pharmacy'),
  userController.getUserById
);

// Update institute including role (Admin only)
router.put(
  '/:id',
  verifyToken,
  authorizeRole('admin'),
  userController.updateUser
);

// Delete institute (Admin only)
router.delete(
  '/:id',
  verifyToken,
  authorizeRole('admin'),
  userController.deleteUser
);

// Institute Pharmacy Management Routes
// --------------------------------------------------

// Create new pharmacy user (Institute only)
router.post(
  '/pharmacy',
  verifyToken,
  authorizeRole('institute'),
  pharmacyController.createPharmacyUser
);

// Get all pharmacy users created by institute (Institute only)
router.get(
  '/pharmacy/all',
  verifyToken,
  authorizeRole('institute'),
  pharmacyController.getPharmacyUsers
);

// Get single pharmacy user (Institute only - must be created by them)
router.get(
  '/pharmacy/:id',
  verifyToken,
  authorizeRole('institute'),
  pharmacyController.getPharmacyUserById
);

// Update pharmacy user (Institute only - must be created by them)
router.put(
  '/pharmacy/:id',
  verifyToken,
  authorizeRole('institute'),
  pharmacyController.updatePharmacyUser
);

// Delete pharmacy user (Institute only - must be created by them)
router.delete(
  '/pharmacy/:id',
  verifyToken,
  authorizeRole('institute'),
  pharmacyController.deletePharmacyUser
);

module.exports = router;