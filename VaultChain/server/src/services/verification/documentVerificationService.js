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
	const targetSha256 = target.sha256Hash || target.sha256 || null;
	const referenceSha256 = reference.sha256Hash || reference.sha256 || null;
	const sha256Match = Boolean(targetSha256 && referenceSha256 && targetSha256.toLowerCase() === referenceSha256.toLowerCase());

	const ocrReady = target.ocrStatus === 'completed' && reference.ocrStatus === 'completed';
	if (!ocrReady || !target.semanticHash || !reference.semanticHash) {
		return {
			semanticHashMatch: null,
			similarityScore: null,
			status: 'unknown',
			report: {
				algorithm: 'sha256_binary_and_normalized_token_jaccard',
				sha256Match,
				targetSha256,
				referenceSha256,
				reason: sha256Match
					? 'Files are binary identical (SHA-256 matches), but OCR is pending/incomplete on one or both documents.'
					: 'Both documents must complete OCR with extracted text before full text comparison.',
				targetOcrStatus: target.ocrStatus,
				referenceOcrStatus: reference.ocrStatus,
			},
		};
	}

	const textComparison = compareText(target.extractedText, reference.extractedText);
	const semanticHashMatch = target.semanticHash === reference.semanticHash;
	const reason = sha256Match
		? 'Exact byte-for-byte binary match (identical SHA-256 hash).'
		: semanticHashMatch
			? 'Normalized OCR text is identical (same content, but different binary encoding/metadata).'
			: 'Normalized OCR text differs from the reference document.';

	return {
		semanticHashMatch,
		similarityScore: semanticHashMatch ? 1 : textComparison.similarityScore,
		status: semanticHashMatch ? 'original' : 'modified',
		report: {
			algorithm: 'sha256_binary_and_normalized_token_jaccard',
			sha256Match,
			targetSha256,
			referenceSha256,
			reason,
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
