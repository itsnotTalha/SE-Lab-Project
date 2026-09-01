const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { singleVaultUpload } = require('../middleware/vaultUpload');
const controller = require('../controllers/vault/vaultController');

const router = express.Router();

router.use(authenticateToken);
router.post('/upload', singleVaultUpload, controller.upload);
router.get('/', controller.list);
router.get('/:id/download', controller.download);
router.get('/:id', controller.details);
router.delete('/:id', controller.remove);

module.exports = router;
