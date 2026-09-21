const express = require('express');

const { getOwnershipHistory } = require('../controllers/ownership/ownershipController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Ownership changes are not requested directly. They happen as part of a
// marketplace settlement, so only the timeline is exposed here.
router.get('/history/:assetId', authenticateToken, getOwnershipHistory);

module.exports = router;
