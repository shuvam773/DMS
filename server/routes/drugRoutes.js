const express = require('express');
const drugCtrl = require('../controllers/drugController');
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/roleMiddleware');
const importController = require('../controllers/importController');
const upload = require('../middlewares/upload');

const router = express.Router();


router.post('/import', verifyToken, authorizeRole('admin', 'institute', 'pharmacy'), upload.single('file'), importController.importDrugs);

// POST Drug all users can create drugs
router.post('/', verifyToken, authorizeRole('admin', 'institute', 'pharmacy'), drugCtrl.addDrug);

// GET All Drugs
router.get('/', verifyToken, authorizeRole('admin', 'institute', 'pharmacy'), drugCtrl.getDrugs);

// GET Expiring Drugs (with optional query parameters) 
router.get('/expiring', verifyToken, authorizeRole('admin', 'institute', 'pharmacy'), drugCtrl.getExpiringDrugs);

// GET Single Drug
router.get('/:id', verifyToken, authorizeRole('admin', 'institute', 'pharmacy'), drugCtrl.getDrugById);

// UPDATE Drugs
router.put('/:id', verifyToken, authorizeRole('admin', 'institute', 'pharmacy'), drugCtrl.updateDrug);

// DELETE Drug
router.delete('/:id', verifyToken, authorizeRole('admin', 'institute', 'pharmacy'), drugCtrl.deleteDrug);




module.exports = router;
