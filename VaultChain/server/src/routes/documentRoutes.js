const express = require('express');

const controller = require('../controllers/document/documentController');
const { authenticateToken } = require('../middleware/auth');
const { singleDocumentUpload } = require('../middleware/upload');

const router = express.Router();
router.use(authenticateToken);
router.post('/', singleDocumentUpload, controller.uploadDocument);
router.get('/', controller.getDocuments);
router.get('/:id/content', controller.getDocumentContent);
router.get('/:id/thumbnail', controller.getDocumentThumbnail);
router.get('/:id/ocr', controller.getOcrResult);
router.post('/:id/ocr', controller.processOcr);
router.post('/:id/verify', controller.verifyDocument);
router.get('/:id/report', controller.getDocumentReport);
router.post('/:id/vault', controller.encryptAndVaultDocument);
router.get('/:id/vault', controller.getDocumentVaultStatus);
router.post('/:id/marketplace', controller.addDocumentToMarketplace);
router.get('/:id', controller.getDocument);
router.delete('/:id', controller.deleteDocument);

module.exports = router;
