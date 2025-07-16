const express = require('express');
const { register, login, getUser, getAllUsers } = require('../controllers/authController');
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/roleMiddleware');


const router = express.Router()

// POST register
router.post("/register", register)

//POST login
router.post("/login", login)

//GET information
router.get('/info',verifyToken,getUser)

// GET all users (admin only)
router.get('/users', verifyToken, authorizeRole('admin'), getAllUsers)

module.exports = router;