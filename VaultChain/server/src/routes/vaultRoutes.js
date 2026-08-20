const express = require('express');

const controller = require('../controllers/vault/vaultController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);
router.post('/', controller.createVault);
router.get('/', controller.getVaults);
router.get('/:reference', controller.getVault);
router.patch('/:reference', controller.updateVault);
router.delete('/:reference', controller.deleteVault);
router.post('/:reference/assets', controller.addAssets);
router.delete('/:reference/assets/:assetId', controller.removeAsset);

module.exports = router;
