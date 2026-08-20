const express = require('express');

const {
	getAsset,
	getAssetContent,
	getAssetHash,
	getAssetMetadata,
	getOwnershipHistory,
	getAssets,
	checkAssetOwnership,
	uploadAsset,
} = require('../controllers/asset/assetController');
const { authenticateToken } = require('../middleware/auth');
const { singleAssetCheckUpload, singleAssetUpload } = require('../middleware/upload');

const router = express.Router();

router.post('/upload', authenticateToken, singleAssetUpload, uploadAsset);
router.post('/check', authenticateToken, singleAssetCheckUpload, checkAssetOwnership);
router.get('/', authenticateToken, getAssets);
router.get('/:id/metadata', authenticateToken, getAssetMetadata);
router.get('/:id/hash', authenticateToken, getAssetHash);
router.get('/:id/ownership-history', authenticateToken, getOwnershipHistory);
router.get('/:id/content', authenticateToken, getAssetContent);
router.get('/:id', authenticateToken, getAsset);

module.exports = router;
