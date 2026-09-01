const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { singleDocumentUpload } = require('../middleware/documentUpload');
const controller = require('../controllers/document/documentController');

const router = express.Router();

router.use(authenticateToken);
router.post('/upload', singleDocumentUpload, controller.upload);
router.get('/', controller.list);
router.get('/:id', controller.details);
router.post('/:id/ocr', controller.runOcr);
router.get('/:id/ocr', controller.getOcr);
router.post('/:id/verify', controller.verify);
router.get('/:id/report', controller.report);

module.exports = router;
