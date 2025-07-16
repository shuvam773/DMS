const express = require('express')
const verifyToken = require('../middlewares/authMiddleware')
const billingCtrl = require('../controllers/billingController')
const authorizeRole = require('../middlewares/roleMiddleware')
const router = express.Router()

// POST Bill
router.post('/',verifyToken, authorizeRole('pharmacy'), billingCtrl.createBill)

//GET Bill
router.get('/', verifyToken, authorizeRole('admin', 'institute', 'pharmacy'), billingCtrl.getBills);

module.exports = router;

