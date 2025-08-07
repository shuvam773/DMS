const express = require('express');
const router = express.Router();
const drugTypeName = require('../controllers/drugTypeName');
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/roleMiddleware');

router.get('/drug-types', verifyToken, drugTypeName.getAllDrugTypes);

router.get('/drug-names/:typeId', verifyToken, drugTypeName.getDrugNamesByType);

// Admin-only routes
router.post('/drug-types', verifyToken, authorizeRole('admin'), drugTypeName.addDrugType);
router.post('/drug-names', verifyToken, authorizeRole('admin'), drugTypeName.addDrugName);
router.delete('/drug-types/:typeId', verifyToken, authorizeRole('admin'), drugTypeName.deleteDrugType);
router.delete('/drug-names/:drugId', verifyToken, authorizeRole('admin'), drugTypeName.deleteDrugName);

module.exports = router;
