const { asyncHandler } = require('../../middleware/asyncHandler');
const documentService = require('../../services/document/documentService');

const uploadDocument = asyncHandler(async (req, res) => {
	const document = await documentService.uploadDocument(req.user.id, req.file, req.body);
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

const getDocumentContent = asyncHandler(async (req, res) => {
	const content = await documentService.getDocumentContent(req.user.id, req.params.id);
	res.type(content.document.mimeType);
	res.set('Cache-Control', 'private, max-age=300');
	res.set('Content-Disposition', 'inline');
	res.sendFile(content.filePath);
});

const deleteDocument = asyncHandler(async (req, res) => {
	await documentService.deleteDocument(req.user.id, req.params.id);
	res.status(204).send();
});

const verifyDocument = asyncHandler(async (req, res) => {
	const { targetDocumentId } = req.body;
	if (!targetDocumentId) {
		const error = new Error('targetDocumentId is required for document verification');
		error.status = 400;
		throw error;
	}
	const verification = await documentService.verifyDocument(req.user.id, req.params.id, targetDocumentId);
	res.json({ success: true, message: 'Document verification completed', verification });
});

const getDocumentReport = asyncHandler(async (req, res) => {
	const report = await documentService.getDocumentReport(req.user.id, req.params.id);
	res.json({ success: true, report });
});

const encryptAndVaultDocument = asyncHandler(async (req, res) => {
	const vault = await documentService.encryptAndVaultDocument(req.user.id, req.params.id, req.body?.secret);
	res.status(201).json({ success: true, message: 'Document encrypted with AES-256-GCM and stored in Secure Vault', vault });
});

const getDocumentVaultStatus = asyncHandler(async (req, res) => {
	const vaultStatus = await documentService.getDocumentVaultStatus(req.user.id, req.params.id);
	res.json({ success: true, vaultStatus });
});

const getDocumentThumbnail = asyncHandler(async (req, res) => {
	const result = await documentService.getDocumentThumbnail(req.user.id, req.params.id);
	res.type(result.mimeType || 'image/png');
	res.set('Cache-Control', 'private, max-age=3600');
	res.set('Content-Disposition', 'inline');
	res.sendFile(result.filePath);
});

module.exports = {
	uploadDocument,
	getDocuments,
	getDocument,
	getOcrResult,
	processOcr,
	getDocumentContent,
	getDocumentThumbnail,
	deleteDocument,
	verifyDocument,
	getDocumentReport,
	encryptAndVaultDocument,
	getDocumentVaultStatus,
};
