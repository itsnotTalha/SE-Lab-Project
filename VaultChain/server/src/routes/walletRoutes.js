const express = require('express');

const { addTransaction, getTransactions, getWallet } = require('../controllers/wallet/walletController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, getWallet);
router.get('/transactions', authenticateToken, getTransactions);
router.post('/transactions', authenticateToken, addTransaction);

module.exports = router;
