const express = require('express');

const { register, login, logout, me, updateProfile, changePassword } = require('../controllers/auth/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, me);
router.patch('/profile', authenticateToken, updateProfile);
router.patch('/password', authenticateToken, changePassword);
router.post('/logout', authenticateToken, logout);

module.exports = router;
