const express = require('express');

const { register, login, me } = require('../controllers/auth/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, me);

module.exports = router;