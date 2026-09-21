const express = require('express');

const { getAssetBlocks, getBlocks, verifyChain } = require('../controllers/blockchain/blockchainController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Blocks are mined by the modules that change ownership, never on request.
router.get('/blocks', authenticateToken, getBlocks);
router.get('/verify', authenticateToken, verifyChain);
router.get('/assets/:assetId', authenticateToken, getAssetBlocks);

module.exports = router;
