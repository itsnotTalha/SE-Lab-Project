const documentRepository = require('../../repositories/documentRepository');
const { normalizeDocumentText } = require('../../utils/semanticHash');

function httpError(status, message) {
	const error = new Error(message);
	error.status = status;
	return error;
}

function parseDocumentId(value, label = 'Document') {
	const id = Number(value);
	if (!Number.isInteger(id) || id <= 0) throw httpError(400, `${label} id must be a positive integer`);
	return id;
}

async function ownedDocument(userId, id) {
	const document = await documentRepository.getDocumentByIdAndOwnerId(id, userId);
	if (!document) throw httpError(404, 'Document not found');
	return document;
}

function tokenSet(text) {
	return new Set(normalizeDocumentText(text).match(/[\p{L}\p{N}]+/gu) || []);
}

function compareText(targetText, referenceText) {
	const targetTokens = tokenSet(targetText);
	const referenceTokens = tokenSet(referenceText);
	if (!targetTokens.size || !referenceTokens.size) {
		return { similarityScore: null, targetTokenCount: targetTokens.size, referenceTokenCount: referenceTokens.size, commonTokenCount: 0 };
	}
	const commonTokenCount = [...targetTokens].filter((token) => referenceTokens.has(token)).length;
	const unionCount = new Set([...targetTokens, ...referenceTokens]).size;
	return {
		similarityScore: Number((commonTokenCount / unionCount).toFixed(4)),
		targetTokenCount: targetTokens.size,
		referenceTokenCount: referenceTokens.size,
		commonTokenCount,
	};
}

function compareOcr(target, reference) {
	const ocrReady = target.ocrStatus === 'completed' && reference.ocrStatus === 'completed';
	if (!ocrReady || !target.semanticHash || !reference.semanticHash) {
		return {
			semanticHashMatch: null,
			similarityScore: null,
			status: 'unknown',
			report: {
				algorithm: 'normalized_sha256_and_token_jaccard',
				reason: 'Both documents must complete OCR with extracted text before verification.',
				targetOcrStatus: target.ocrStatus,
				referenceOcrStatus: reference.ocrStatus,
			},
		};
	}

	const textComparison = compareText(target.extractedText, reference.extractedText);
	const semanticHashMatch = target.semanticHash === reference.semanticHash;
	return {
		semanticHashMatch,
		similarityScore: semanticHashMatch ? 1 : textComparison.similarityScore,
		status: semanticHashMatch ? 'original' : 'modified',
		report: {
			algorithm: 'normalized_sha256_and_token_jaccard',
			reason: semanticHashMatch ? 'Normalized OCR text is identical.' : 'Normalized OCR text differs from the reference document.',
			tokenComparison: textComparison,
		},
	};
}

async function verifyDocument(userId, documentIdValue, { referenceDocumentId } = {}) {
	if (!userId) throw httpError(401, 'Unauthorized');
	const documentId = parseDocumentId(documentIdValue);
	const referenceId = parseDocumentId(referenceDocumentId, 'Reference document');
	if (documentId === referenceId) throw httpError(400, 'Reference document must be different from the document being verified');

	const [document, referenceDocument] = await Promise.all([
		ownedDocument(userId, documentId),
		ownedDocument(userId, referenceId),
	]);
	const comparison = compareOcr(document, referenceDocument);
	return documentRepository.createDocumentVerification({
		userId,
		documentId,
		referenceDocumentId: referenceId,
		...comparison,
	});
}

async function getVerificationHistory(userId, documentIdValue) {
	if (!userId) throw httpError(401, 'Unauthorized');
	const documentId = parseDocumentId(documentIdValue);
	await ownedDocument(userId, documentId);
	return documentRepository.getDocumentVerificationHistory(documentId, userId);
}

module.exports = { compareOcr, compareText, verifyDocument, getVerificationHistory };
