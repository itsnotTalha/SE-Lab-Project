const express = require('express');

const controller = require('../controllers/document/documentController');
const { authenticateToken } = require('../middleware/auth');
const { singleDocumentUpload } = require('../middleware/upload');

const router = express.Router();
router.use(authenticateToken);
router.post('/', singleDocumentUpload, controller.uploadDocument);
router.get('/', controller.getDocuments);
router.get('/:id/content', controller.getDocumentContent);
router.get('/:id/ocr', controller.getOcrResult);
router.post('/:id/ocr', controller.processOcr);
router.get('/:id', controller.getDocument);
router.delete('/:id', controller.deleteDocument);

module.exports = router;
