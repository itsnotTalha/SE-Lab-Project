const fs = require('fs/promises');
const path = require('path');
const repository = require('../../repositories/documentRepository');
const { documentUploadDirectory } = require('../../middleware/upload');
const { generateFileSha256 } = require('../hashing/sha256Service');
const { generateMetadataSha256 } = require('../hashing/documentHashService');
const { generateTextSha256, calculateTextSimilarity, findTextDifferences } = require('../hashing/textHashService');

async function ownedDocument(userId, value) {
	const id = Number(value);
	const document = Number.isSafeInteger(id) && id > 0
		? await repository.getDocumentByIdAndOwnerId(id, userId) : null;
	if (!document) throw Object.assign(new Error('Document not found'), { status: 404 });
	return document;
}

async function integrity(document) {
	const filePath = path.resolve(documentUploadDirectory, path.basename(document.storedName));
	let actualSha256 = null;
	let sizeMatch = false;
	try {
		actualSha256 = await generateFileSha256(filePath);
		sizeMatch = (await fs.stat(filePath)).size === document.fileSize;
	} catch (error) { if (error.code !== 'ENOENT' && error.status !== 404) throw error; }
	return {
		fileMatch: Boolean(actualSha256 && actualSha256 === document.sha256Hash && sizeMatch),
		metadataMatch: document.metadataSha256 ? generateMetadataSha256(document) === document.metadataSha256 : null,
		actualSha256,
	};
}

async function verifyDocument(userId, sourceId, targetId) {
	const source = await ownedDocument(userId, sourceId);
	const target = targetId === undefined || targetId === null ? null : await ownedDocument(userId, targetId);
	const sourceIntegrity = await integrity(source);
	const targetIntegrity = target ? await integrity(target) : null;
	const sha256Match = target ? sourceIntegrity.actualSha256 !== null && sourceIntegrity.actualSha256 === targetIntegrity.actualSha256 : sourceIntegrity.fileMatch;
	const textAvailable = Boolean(target && source.ocrStatus === 'completed' && target.ocrStatus === 'completed' && generateTextSha256(source.extractedText) && generateTextSha256(target.extractedText));
	const textMatch = textAvailable ? generateTextSha256(source.extractedText) === generateTextSha256(target.extractedText) : null;
	const metadataMatch = target ? generateMetadataSha256(source) === generateMetadataSha256(target) : sourceIntegrity.metadataMatch;
	const similarityScore = textAvailable ? calculateTextSimilarity(source.extractedText, target.extractedText) : null;
	const tampered = !sourceIntegrity.fileMatch || sourceIntegrity.metadataMatch === false || (targetIntegrity && (!targetIntegrity.fileMatch || targetIntegrity.metadataMatch === false));
	let status;
	let classification;
	if (tampered) { status = 'modified'; classification = 'STORED FILE OR METADATA CHANGED'; }
	else if (!target) { status = sourceIntegrity.metadataMatch === null ? 'unknown' : 'original'; classification = sourceIntegrity.metadataMatch === null ? 'FILE INTACT; NO METADATA BASELINE' : 'FILE AND METADATA INTACT'; }
	else if (sha256Match) { status = 'original'; classification = 'EXACT FILE MATCH'; }
	else if (textMatch) { status = 'modified'; classification = 'SAME EXTRACTED TEXT; FILES DIFFER'; }
	else { status = textAvailable ? 'modified' : 'unknown'; classification = textAvailable ? 'DIFFERENT CONTENT' : 'TEXT COMPARISON UNAVAILABLE'; }
	const summary = (document) => ({ id: document.id, originalName: document.originalName, sha256: document.sha256Hash, metadataSha256: document.metadataSha256, textSha256: document.textSha256 });
	const report = {
		sourceDocument: summary(source), targetDocument: target ? summary(target) : null,
		evidence: {
			sha256Match, textMatch, metadataMatch, similarityScore, status, classification,
			sourceIntegrity, targetIntegrity,
			differences: textAvailable ? findTextDifferences(source.extractedText, target.extractedText) : null,
		},
		verifiedAt: new Date().toISOString(),
	};
	const saved = await repository.saveDocumentVerificationReport({ userId, documentId: source.id, targetDocumentId: target?.id || null, sha256Match, similarityScore, status, reportJson: report });
	return { id: saved.id, documentId: source.id, targetDocumentId: target?.id || null, status, report };
}

async function getDocumentReport(userId, id) {
	const document = await ownedDocument(userId, id);
	const row = await repository.getDocumentVerificationReport(document.id, userId);
	return row ? { hasReport: true, id: row.id, report: JSON.parse(row.report_json) } : { hasReport: false };
}

module.exports = { verifyDocument, getDocumentReport };
