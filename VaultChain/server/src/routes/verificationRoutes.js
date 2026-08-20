const express = require('express');

const {
	createVerification,
	getVerification,
	getVerifications,
} = require('../controllers/verification/verificationController');
const { authenticateToken } = require('../middleware/auth');
const { singleAssetCheckUpload } = require('../middleware/upload');

const router = express.Router();

router.post('/', authenticateToken, singleAssetCheckUpload, createVerification);
router.get('/', authenticateToken, getVerifications);
router.get('/:reference', authenticateToken, getVerification);

module.exports = router;
