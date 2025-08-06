const express = require('express');
const router = express.Router();
const { handleChatbotQuery } = require('../controllers/chatbotController');
const verifyToken = require('../middlewares/authMiddleware');

// POST /api/chatbot
router.post('/',verifyToken, handleChatbotQuery);

module.exports = router;
