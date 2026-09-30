const express = require('express');

const { register, login, logout, me, updateProfile, changePassword } = require('../controllers/auth/authController');
const { authenticateToken } = require('../middleware/auth');

const { asyncHandler } = require('../middleware/asyncHandler');
const recovery = require('../services/auth/recoveryService');
const router = express.Router();

router.get('/recovery/questions', (req, res) => res.json({ questions: recovery.QUESTIONS }));
router.get('/recovery', authenticateToken, (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }, asyncHandler(async (req, res) => {
  res.json(await recovery.getSettings(req.user.id));
}));
router.put('/recovery', authenticateToken, recovery.limitRequest, asyncHandler(async (req, res) => {
  res.json(await recovery.saveSettings(req.user.id, req.body));
}));
router.post('/forgot-password', recovery.limitRequest, asyncHandler(async (req, res) => {
  res.json(await recovery.resetPassword(req.body));
}));

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, me);
router.patch('/profile', authenticateToken, updateProfile);
router.patch('/password', authenticateToken, changePassword);
router.post('/logout', authenticateToken, logout);

module.exports = router;
