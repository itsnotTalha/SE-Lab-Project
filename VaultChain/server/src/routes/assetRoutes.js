const express = require('express');

const { getAssetHash, getAssetMetadata, uploadAsset } = require('../controllers/asset/assetController');
const { authenticateToken } = require('../middleware/auth');
const { singleAssetUpload } = require('../middleware/upload');

const router = express.Router();

router.post('/upload', authenticateToken, singleAssetUpload, uploadAsset);
router.get('/:id/metadata', authenticateToken, getAssetMetadata);
router.get('/:id/hash', authenticateToken, getAssetHash);

module.exports = router;