const express = require('express');

const { uploadAsset } = require('../controllers/asset/assetController');
const { authenticateToken } = require('../middleware/auth');
const { singleAssetUpload } = require('../middleware/upload');

const router = express.Router();

router.post('/upload', authenticateToken, singleAssetUpload, uploadAsset);

module.exports = router;