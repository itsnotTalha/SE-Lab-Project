const { database } = require('../database/database');
const { serializeTransaction } = require('../database/transactionQueue');
const { createSemanticHash } = require('../utils/semanticHash');

function run(sql, params = []) {
	return new Promise((resolve, reject) => database.run(sql, params, function onRun(error) {
		if (error) reject(error); else resolve(this);
	}));
}

function get(sql, params = []) {
	return new Promise((resolve, reject) => database.get(sql, params, (error, row) => error ? reject(error) : resolve(row)));
}

function all(sql, params = []) {
	return new Promise((resolve, reject) => database.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
}

const DOCUMENT_SELECT = `
	SELECT d.id, d.owner_id, d.original_name, d.stored_name, d.file_path, d.mime_type,
		d.file_size, d.sha256_hash, d.page_count, d.language, d.ocr_status,
		d.ocr_error, d.ocr_processed_at, d.created_at,
		o.extracted_text, o.confidence, o.semantic_hash
	FROM documents d
	LEFT JOIN ocr_results o ON o.document_id = d.id`;

function formatUtcIso(value) {
	if (!value) return null;
	if (typeof value === 'string') {
		if (value.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(value)) return value;
		return `${value.replace(' ', 'T')}Z`;
	}
	try {
		return new Date(value).toISOString();
	} catch {
		return value;
	}
}

function mapRow(row, includeText = true) {
	if (!row) return null;
	return {
		id: row.id,
		ownerId: row.owner_id,
		originalName: row.original_name,
		storedName: row.stored_name,
		filePath: row.file_path,
		mimeType: row.mime_type,
		fileSize: row.file_size,
		sha256Hash: row.sha256_hash,
		pageCount: row.page_count,
		language: row.language,
		ocrStatus: row.ocr_status,
		ocrError: row.ocr_error,
		ocrProcessedAt: formatUtcIso(row.ocr_processed_at),
		createdAt: formatUtcIso(row.created_at),
		...(includeText ? {
			extractedText: row.extracted_text,
			confidence: row.confidence,
			semanticHash: row.semantic_hash,
		} : {}),
	};
}

async function createDocument({ ownerId, originalName, storedName, filePath, mimeType, fileSize, sha256Hash }) {
	const result = await run(
		`INSERT INTO documents
		 (owner_id, original_name, stored_name, file_path, mime_type, file_size, sha256_hash, language, ocr_status)
		 VALUES (?, ?, ?, ?, ?, ?, ?, 'eng', 'pending')`,
		[ownerId, originalName, storedName, filePath, mimeType, fileSize, sha256Hash]
	);
	return getDocumentByIdAndOwnerId(result.lastID, ownerId);
}

async function getDocumentsByOwnerId(ownerId, { search = '', type = '', ocrStatus = '' } = {}) {
	const conditions = ['d.owner_id = ?'];
	const filterParams = [ownerId];
	if (search) {
		conditions.push(`(
			instr(lower(d.original_name), lower(?)) > 0
			OR instr(lower(d.sha256_hash), lower(?)) > 0
			OR instr(lower('DOC-' || printf('%06d', d.id)), lower(?)) > 0
			OR instr(CAST(d.id AS TEXT), ?) > 0
			OR instr(lower(COALESCE(o.extracted_text, '')), lower(?)) > 0
		)`);
		filterParams.push(search, search, search, search, search);
	}
	if (type === 'pdf') conditions.push("d.mime_type = 'application/pdf'");
	if (type === 'image') conditions.push("d.mime_type LIKE 'image/%'");
	if (ocrStatus) {
		conditions.push('d.ocr_status = ?');
		filterParams.push(ocrStatus);
	}

	const snippet = search
		? `CASE WHEN instr(lower(COALESCE(o.extracted_text, '')), lower(?)) > 0
			THEN substr(o.extracted_text,
				max(1, instr(lower(o.extracted_text), lower(?)) - 50), 160)
			ELSE NULL END AS ocr_snippet`
		: 'NULL AS ocr_snippet';
	const snippetParams = search ? [search, search] : [];
	const rows = await all(
		`SELECT d.id, d.owner_id, d.original_name, d.stored_name, d.file_path, d.mime_type,
			d.file_size, d.sha256_hash, d.page_count, d.language, d.ocr_status,
			d.ocr_error, d.ocr_processed_at, d.created_at, ${snippet}
		 FROM documents d
		 LEFT JOIN ocr_results o ON o.document_id = d.id
		 WHERE ${conditions.join(' AND ')}
		 ORDER BY d.created_at DESC, d.id DESC`,
		[...snippetParams, ...filterParams]
	);

	return rows.map((row) => ({
		...mapRow(row, false),
		...(search ? {
			matchedOcrText: Boolean(row.ocr_snippet),
			ocrSnippet: row.ocr_snippet?.trim() || null,
		} : {}),
	}));
}

async function getDocumentByIdAndOwnerId(id, ownerId) {
	return mapRow(await get(`${DOCUMENT_SELECT} WHERE d.id = ? AND d.owner_id = ? LIMIT 1`, [id, ownerId]));
}

async function findDocumentBySha256(ownerId, sha256Hash, excludeId = null) {
	const sql = excludeId
		? `${DOCUMENT_SELECT} WHERE d.sha256_hash = ? AND d.id != ? ORDER BY (d.owner_id = ?) DESC, d.id DESC LIMIT 1`
		: `${DOCUMENT_SELECT} WHERE d.sha256_hash = ? ORDER BY (d.owner_id = ?) DESC, d.id DESC LIMIT 1`;
	const params = excludeId ? [sha256Hash, excludeId, ownerId] : [sha256Hash, ownerId];
	return mapRow(await get(sql, params));
}

async function findSimilarDocument(ownerId, excludeId, currentDoc, compareTextFn) {
	// 1. Check exact binary SHA-256 match across all documents on server
	if (currentDoc.sha256Hash) {
		const exactSha = await findDocumentBySha256(ownerId, currentDoc.sha256Hash, excludeId);
		if (exactSha) {
			return {
				matchType: 'exact_sha256',
				matchedDocument: exactSha,
				similarityScore: 1,
				status: 'original',
				ocrMatchPercent: 100,
				modificationPercent: 0,
			};
		}
	}

	// 2. Check OCR semantic hash or token similarity across ALL documents on server
	if (currentDoc.extractedText) {
		const candidates = (await all(
			`${DOCUMENT_SELECT} WHERE d.id != ? AND o.extracted_text IS NOT NULL ORDER BY (d.owner_id = ?) DESC, d.id DESC`,
			[excludeId, ownerId]
		)).map(mapRow);

		// Check exact semantic hash (same text, re-saved file)
		for (const cand of candidates) {
			if (cand.semanticHash && cand.semanticHash === currentDoc.semanticHash) {
				return {
					matchType: 'semantic_ocr',
					matchedDocument: cand,
					similarityScore: 1,
					status: 'original',
					ocrMatchPercent: 100,
					modificationPercent: 0,
				};
			}
		}

		// Check token similarity against every document
		// Only classify as duplicate/modified if similarity is high (>= 70%)
		// Below 70% similarity represents different documents that happen to share common words
		if (typeof compareTextFn === 'function') {
			let bestMatch = null;
			let highestScore = 0;
			for (const cand of candidates) {
				const comparison = compareTextFn(currentDoc.extractedText, cand.extractedText);
				const score = comparison?.similarityScore || 0;
				if (score > highestScore) {
					highestScore = score;
					bestMatch = cand;
				}
			}

			if (bestMatch && highestScore >= 0.70) {
				const ocrPercent = Math.round(highestScore * 100);
				const modPercent = Math.round((1 - highestScore) * 100);
				return {
					matchType: 'modified',
					matchedDocument: bestMatch,
					similarityScore: highestScore,
					status: highestScore >= 0.98 ? 'original' : 'modified',
					ocrMatchPercent: ocrPercent,
					modificationPercent: modPercent,
				};
			}
		}
	}

	return null;
}

async function setOcrStatus(id, ownerId, status, error = null) {
	await run(
		`UPDATE documents SET ocr_status = ?, ocr_error = ?,
		 ocr_processed_at = CASE WHEN ? IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE ocr_processed_at END
		 WHERE id = ? AND owner_id = ?`,
		[status, error, status, id, ownerId]
	);
}

async function saveOcrResult(id, ownerId, { text, confidence, pageCount, language = 'eng' }) {
	const semanticHash = createSemanticHash(text);
	return serializeTransaction(async () => {
		await run('BEGIN TRANSACTION');
		try {
			await run(
				`INSERT INTO ocr_results (document_id, extracted_text, confidence, semantic_hash, created_at)
				 VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
				 ON CONFLICT(document_id) DO UPDATE SET
				 extracted_text = excluded.extracted_text, confidence = excluded.confidence,
				 semantic_hash = excluded.semantic_hash, created_at = CURRENT_TIMESTAMP`,
				[id, text, confidence, semanticHash]
			);
			const result = await run(
				`UPDATE documents SET ocr_status = 'completed', ocr_error = NULL,
				 ocr_processed_at = CURRENT_TIMESTAMP, page_count = ?, language = ?
				 WHERE id = ? AND owner_id = ?`,
				[pageCount, language, id, ownerId]
			);
			if (result.changes !== 1) {
				const error = new Error('Document not found');
				error.status = 404;
				throw error;
			}
			await run('COMMIT');
		} catch (error) {
			try { await run('ROLLBACK'); } catch (rollbackError) { void rollbackError; }
			throw error;
		}
	});
}

function mapVerificationRow(row) {
	if (!row) return null;
	let report = {};
	try {
		report = row.report_json ? JSON.parse(row.report_json) : {};
	} catch {
		report = {};
	}
	return {
		id: row.id,
		documentId: row.document_id,
		documentName: row.document_name,
		referenceDocumentId: row.reference_document_id,
		referenceDocumentName: row.reference_document_name,
		semanticHashMatch: row.semantic_hash_match == null ? null : Boolean(row.semantic_hash_match),
		similarityScore: row.similarity_score,
		status: row.status,
		report,
		createdAt: formatUtcIso(row.created_at),
	};
}

const OWNED_DOCUMENT_VERIFICATION_SELECT = `
	SELECT dv.*, d.original_name AS document_name, rd.original_name AS reference_document_name
	FROM document_verifications dv
	JOIN documents d ON d.id = dv.document_id AND d.owner_id = dv.user_id
	JOIN documents rd ON rd.id = dv.reference_document_id AND rd.owner_id = dv.user_id`;

async function createDocumentVerification({
	userId,
	documentId,
	referenceDocumentId,
	semanticHashMatch,
	similarityScore,
	status,
	report,
}) {
	const result = await run(
		`INSERT INTO document_verifications
		 (user_id, document_id, reference_document_id, semantic_hash_match, similarity_score, status, report_json)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		[
			userId,
			documentId,
			referenceDocumentId,
			semanticHashMatch == null ? null : semanticHashMatch ? 1 : 0,
			similarityScore,
			status,
			JSON.stringify(report || {}),
		]
	);
	return mapVerificationRow(await get(`${OWNED_DOCUMENT_VERIFICATION_SELECT}
		WHERE dv.id = ? AND dv.user_id = ? LIMIT 1`, [result.lastID, userId]));
}

async function getLatestDocumentVerification(documentId, userId) {
	return mapVerificationRow(await get(`${OWNED_DOCUMENT_VERIFICATION_SELECT}
		WHERE dv.document_id = ? AND dv.user_id = ?
		ORDER BY dv.created_at DESC, dv.id DESC LIMIT 1`, [documentId, userId]));
}

async function getDocumentVerificationHistory(documentId, userId) {
	const rows = await all(`${OWNED_DOCUMENT_VERIFICATION_SELECT}
		WHERE dv.document_id = ? AND dv.user_id = ?
		ORDER BY dv.created_at DESC, dv.id DESC`, [documentId, userId]);
	return rows.map(mapVerificationRow);
}

async function deleteDocument(id, ownerId) {
	return run('DELETE FROM documents WHERE id = ? AND owner_id = ?', [id, ownerId]);
}

module.exports = {
	createDocument,
	getDocumentsByOwnerId,
	getDocumentByIdAndOwnerId,
	setOcrStatus,
	saveOcrResult,
	createDocumentVerification,
	getLatestDocumentVerification,
	getDocumentVerificationHistory,
	deleteDocument,
	findDocumentBySha256,
	findSimilarDocument,
};
