const documentRepository = require('../../repositories/documentRepository');
const { calculateTextSimilarity, findTextDifferences, normalizeText } = require('../hashing/textHashService');
const { isGeminiConfigured } = require('../ocr/geminiOcrService');

function httpError(status, message) {
	const error = new Error(message);
	error.status = status;
	return error;
}

/**
 * Optional Gemini semantic comparison to explain semantic differences.
 */
async function geminiSemanticCompare(textA, textB) {
	if (!isGeminiConfigured()) return null;
	const apiKey = process.env.GEMINI_API_KEY?.trim();
	const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
	const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

	const prompt = `Compare the following two document texts and summarize what was changed, added, or removed.
Document A (Reference):
"""
${textA.slice(0, 3000)}
"""

Document B (Comparison):
"""
${textB.slice(0, 3000)}
"""

Provide a concise 2-sentence summary of the differences and whether the document was modified or is completely different.`;

	try {
		const res = await fetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contents: [{ role: 'user', parts: [{ text: prompt }] }],
				generationConfig: { temperature: 0.2 },
			}),
		});
		if (!res.ok) return null;
		const data = await res.json();
		return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
	} catch {
		return null;
	}
}

/**
 * Verifies document integrity against another target document owned by the user.
 */
async function verifyDocument(userId, sourceDocumentId, targetDocumentId) {
	const sourceDoc = await documentRepository.getDocumentByIdAndOwnerId(sourceDocumentId, userId);
	if (!sourceDoc) throw httpError(404, 'Source document not found');

	const targetDoc = await documentRepository.getDocumentByIdAndOwnerId(targetDocumentId, userId);
	if (!targetDoc) throw httpError(404, 'Target document to compare against not found');

	const sha256Match = Boolean(sourceDoc.sha256Hash && targetDoc.sha256Hash && sourceDoc.sha256Hash === targetDoc.sha256Hash);
	const textA = sourceDoc.extractedText || '';
	const textB = targetDoc.extractedText || '';
	const textMatch = Boolean(textA && textB && normalizeText(textA) === normalizeText(textB));

	let similarityScore = 0;
	let status = 'unknown';
	let classification = 'UNKNOWN';
	let differences = { addedWords: [], removedWords: [], wordCountDifference: 0 };
	let semanticExplanation = null;

	if (sha256Match) {
		similarityScore = 1.0;
		status = 'original';
		classification = 'ORIGINAL (EXACT FILE MATCH)';
	} else if (textMatch) {
		similarityScore = 1.0;
		status = 'original';
		classification = 'ORIGINAL (IDENTICAL CONTENT MATCH)';
	} else {
		similarityScore = calculateTextSimilarity(textA, textB);
		differences = findTextDifferences(textA, textB);

		if (similarityScore >= 0.70) {
			status = 'modified';
			classification = 'MODIFIED (SIMILAR CONTENT WITH CHANGES)';
		} else if (similarityScore >= 0.35) {
			status = 'modified';
			classification = 'MODIFIED (PARTIAL OVERLAP)';
		} else {
			status = 'unknown';
			classification = 'UNKNOWN (LOW SIMILARITY / DIFFERENT DOCUMENT)';
		}

		if (isGeminiConfigured() && (textA || textB)) {
			semanticExplanation = await geminiSemanticCompare(textA, textB);
		}
	}

	const reportPayload = {
		sourceDocument: {
			id: sourceDoc.id,
			reference: `DOC-${String(sourceDoc.id).padStart(6, '0')}`,
			originalName: sourceDoc.originalName,
			sha256: sourceDoc.sha256Hash,
			textSha256: sourceDoc.textSha256,
		},
		targetDocument: {
			id: targetDoc.id,
			reference: `DOC-${String(targetDoc.id).padStart(6, '0')}`,
			originalName: targetDoc.originalName,
			sha256: targetDoc.sha256Hash,
			textSha256: targetDoc.textSha256,
		},
		evidence: {
			sha256Match,
			textMatch,
			similarityScore: Math.round(similarityScore * 100) / 100,
			similarityPercentage: `${Math.round(similarityScore * 100)}%`,
			status,
			classification,
			differences,
			semanticExplanation,
		},
		verifiedAt: new Date().toISOString(),
	};

	const savedReport = await documentRepository.saveDocumentVerificationReport({
		userId,
		documentId: sourceDoc.id,
		targetDocumentId: targetDoc.id,
		sha256Match,
		similarityScore,
		status,
		reportJson: reportPayload,
	});

	return {
		id: savedReport.id,
		documentId: sourceDoc.id,
		targetDocumentId: targetDoc.id,
		status,
		similarityScore,
		sha256Match,
		report: reportPayload,
		createdAt: savedReport.created_at,
	};
}

async function getDocumentReport(userId, documentId) {
	const document = await documentRepository.getDocumentByIdAndOwnerId(documentId, userId);
	if (!document) throw httpError(404, 'Document not found');

	const row = await documentRepository.getDocumentVerificationReport(document.id, userId);
	if (!row) {
		return {
			hasReport: false,
			documentId: document.id,
			message: 'No verification report generated yet for this document',
		};
	}

	let reportData = null;
	try {
		reportData = JSON.parse(row.report_json);
	} catch {
		reportData = row.report_json;
	}

	return {
		hasReport: true,
		id: row.id,
		documentId: row.document_id,
		targetDocumentId: row.target_document_id,
		sha256Match: Boolean(row.sha256_match),
		similarityScore: row.similarity_score,
		status: row.status,
		report: reportData,
		createdAt: row.created_at,
	};
}

module.exports = {
	verifyDocument,
	getDocumentReport,
};
