const { asyncHandler } = require('../../middleware/asyncHandler');
const documentService = require('../../services/document/documentService');
const documentVerificationService = require('../../services/verification/documentVerificationService');

const uploadDocument = asyncHandler(async (req, res) => {
	const document = await documentService.uploadDocument(req.user.id, req.file);
	res.status(201).json({ success: true, message: 'Document uploaded successfully', document });
});

const getDocuments = asyncHandler(async (req, res) => {
	res.json({ success: true, documents: await documentService.getDocuments(req.user.id, req.query) });
});

const getDocument = asyncHandler(async (req, res) => {
	res.json({ success: true, document: await documentService.getDocument(req.user.id, req.params.id) });
});

const getOcrResult = asyncHandler(async (req, res) => {
	res.json({ success: true, ocr: await documentService.getOcrResult(req.user.id, req.params.id) });
});

const processOcr = asyncHandler(async (req, res) => {
	res.json({ success: true, message: 'OCR processing finished', document: await documentService.processOcr(req.user.id, req.params.id) });
});

const verifyDocument = asyncHandler(async (req, res) => {
	const verification = await documentVerificationService.verifyDocument(req.user.id, req.params.id, req.body);
	res.status(201).json({ success: true, message: 'Document verification completed', verification });
});

const getVerificationHistory = asyncHandler(async (req, res) => {
	const history = await documentVerificationService.getVerificationHistory(req.user.id, req.params.id);
	res.json({ success: true, history });
});

const getDocumentContent = asyncHandler(async (req, res) => {
	const content = await documentService.getDocumentContent(req.user.id, req.params.id);
	res.type(content.document.mimeType);
	res.set('Cache-Control', 'private, max-age=300');
	res.set('Content-Disposition', 'inline');
	res.sendFile(content.filePath);
});

const getDocumentPreview = asyncHandler(async (req, res) => {
	const preview = await documentService.getDocumentPreview(req.user.id, req.params.id);
	res.type(preview.mimeType);
	res.set('Cache-Control', 'private, max-age=300');
	if (preview.buffer) {
		res.send(preview.buffer);
		return;
	}
	res.sendFile(preview.filePath);
});

const deleteDocument = asyncHandler(async (req, res) => {
	await documentService.deleteDocument(req.user.id, req.params.id);
	res.status(204).send();
});

module.exports = {
	uploadDocument,
	getDocuments,
	getDocument,
	getOcrResult,
	processOcr,
	verifyDocument,
	getVerificationHistory,
	getDocumentContent,
	getDocumentPreview,
	deleteDocument,
};
