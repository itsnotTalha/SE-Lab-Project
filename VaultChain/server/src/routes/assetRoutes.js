const express = require('express');

const { getAssetMetadata, uploadAsset } = require('../controllers/asset/assetController');
const { authenticateToken } = require('../middleware/auth');
const { singleAssetUpload } = require('../middleware/upload');

const router = express.Router();

router.post('/upload', authenticateToken, singleAssetUpload, uploadAsset);
router.get('/:id/metadata', authenticateToken, getAssetMetadata);

module.exports = router;