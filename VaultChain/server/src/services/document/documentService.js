const fs = require('fs/promises');
const path = require('path');

const { documentUploadDirectory } = require('../../middleware/upload');
const documentRepository = require('../../repositories/documentRepository');
const { generateFileSha256 } = require('../hashing/sha256Service');
const { extractDocumentText } = require('../ocr/ocrService');

function httpError(status, message) {
	const error = new Error(message);
	error.status = status;
	return error;
}

function documentId(value) {
	const id = Number(value);
	if (!Number.isInteger(id) || id <= 0) throw httpError(404, 'Document not found');
	return id;
}

function safeOriginalName(value) {
	return path.basename(String(value || 'document')).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180) || 'document';
}

function contentPath(document) {
	return path.resolve(documentUploadDirectory, path.basename(document.storedName));
}

function publicDocument(document, includeOcr = false) {
	return {
		id: document.id,
		reference: `DOC-${String(document.id).padStart(6, '0')}`,
		originalName: document.originalName,
		mimeType: document.mimeType,
		fileSize: document.fileSize,
		sha256: document.sha256Hash,
		pageCount: document.pageCount,
		language: document.language,
		ocrStatus: document.ocrStatus,
		ocrProcessedAt: document.ocrProcessedAt,
		createdAt: document.createdAt,
		contentUrl: `/api/documents/${document.id}/content`,
		...(includeOcr ? { extractedText: document.extractedText || '', ocrError: document.ocrError || null, confidence: document.confidence } : {}),
	};
}

async function ownedDocument(userId, id) {
	const document = await documentRepository.getDocumentByIdAndOwnerId(documentId(id), userId);
	if (!document) throw httpError(404, 'Document not found');
	return document;
}

function safeOcrError(error) {
	if (/limited to \d+ pages/.test(error.message || '')) return error.message;
	return 'Text extraction failed. You can retry OCR.';
}

async function processOcr(userId, id) {
	const document = await ownedDocument(userId, id);
	await documentRepository.setOcrStatus(document.id, userId, 'processing');
	try {
		const result = await extractDocumentText({ filePath: contentPath(document), mimeType: document.mimeType });
		await documentRepository.saveOcrResult(document.id, userId, result);
	} catch (error) {
		await documentRepository.setOcrStatus(document.id, userId, 'failed', safeOcrError(error));
	}
	return publicDocument(await ownedDocument(userId, document.id), true);
}

async function uploadDocument(userId, file) {
	if (!file) throw httpError(400, 'Document file is required');
	let document;
	try {
		document = await documentRepository.createDocument({
			ownerId: userId,
			originalName: safeOriginalName(file.originalname),
			storedName: path.basename(file.filename),
			filePath: file.path,
			mimeType: file.mimetype,
			fileSize: file.size,
			sha256Hash: await generateFileSha256(file.path),
		});
	} catch (error) {
		await fs.unlink(file.path).catch(() => {});
		throw error;
	}
	return processOcr(userId, document.id);
}

function listOptions(query = {}) {
	const value = (name) => {
		if (Array.isArray(query[name])) throw httpError(400, `Invalid ${name} filter`);
		return String(query[name] || '').trim();
	};
	const search = value('search');
	const type = value('type').toLowerCase();
	const ocrStatus = value('ocrStatus').toLowerCase();
	if (search.length > 200) throw httpError(400, 'Search must be 200 characters or fewer');
	if (type && !['pdf', 'image'].includes(type)) throw httpError(400, 'Invalid document type filter');
	if (ocrStatus && !['pending', 'processing', 'completed', 'failed'].includes(ocrStatus)) {
		throw httpError(400, 'Invalid OCR status filter');
	}
	return { search, type, ocrStatus };
}

async function getDocuments(userId, query) {
	return (await documentRepository.getDocumentsByOwnerId(userId, listOptions(query))).map((document) => ({
		...publicDocument(document),
		matchedOcrText: document.matchedOcrText,
		ocrSnippet: document.ocrSnippet,
	}));
}

async function getDocument(userId, id) {
	return publicDocument(await ownedDocument(userId, id), true);
}

async function getOcrResult(userId, id) {
	const document = await ownedDocument(userId, id);
	return {
		status: document.ocrStatus,
		extractedText: document.extractedText || '',
		processedAt: document.ocrProcessedAt,
		error: document.ocrError || null,
		confidence: document.confidence,
	};
}

async function getDocumentContent(userId, id) {
	const document = await ownedDocument(userId, id);
	return { document: publicDocument(document), filePath: contentPath(document) };
}

async function deleteDocument(userId, id) {
	const document = await ownedDocument(userId, id);
	await documentRepository.deleteDocument(document.id, userId);
	await fs.unlink(contentPath(document)).catch((error) => {
		if (error.code !== 'ENOENT') void error;
	});
}

module.exports = {
	uploadDocument,
	getDocuments,
	getDocument,
	getOcrResult,
	getDocumentContent,
	processOcr,
	deleteDocument,
};
