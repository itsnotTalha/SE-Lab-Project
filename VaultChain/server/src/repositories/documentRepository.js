const { database } = require('../database/database');
const { serializeTransaction } = require('../database/transactionQueue');

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
		o.extracted_text, o.confidence
	FROM documents d
	LEFT JOIN ocr_results o ON o.document_id = d.id`;

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
		ocrProcessedAt: row.ocr_processed_at,
		createdAt: row.created_at,
		...(includeText ? { extractedText: row.extracted_text, confidence: row.confidence } : {}),
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
		conditions.push(`(instr(lower(d.original_name), lower(?)) > 0
			OR instr(lower(COALESCE(o.extracted_text, '')), lower(?)) > 0)`);
		filterParams.push(search, search);
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

async function setOcrStatus(id, ownerId, status, error = null) {
	await run(
		`UPDATE documents SET ocr_status = ?, ocr_error = ?,
		 ocr_processed_at = CASE WHEN ? IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE ocr_processed_at END
		 WHERE id = ? AND owner_id = ?`,
		[status, error, status, id, ownerId]
	);
}

async function saveOcrResult(id, ownerId, { text, confidence, pageCount, language = 'eng' }) {
	return serializeTransaction(async () => {
		await run('BEGIN TRANSACTION');
		try {
			await run(
				`INSERT INTO ocr_results (document_id, extracted_text, confidence, created_at)
				 VALUES (?, ?, ?, CURRENT_TIMESTAMP)
				 ON CONFLICT(document_id) DO UPDATE SET
				 extracted_text = excluded.extracted_text, confidence = excluded.confidence, created_at = CURRENT_TIMESTAMP`,
				[id, text, confidence]
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

async function deleteDocument(id, ownerId) {
	return run('DELETE FROM documents WHERE id = ? AND owner_id = ?', [id, ownerId]);
}

module.exports = {
	createDocument,
	getDocumentsByOwnerId,
	getDocumentByIdAndOwnerId,
	setOcrStatus,
	saveOcrResult,
	deleteDocument,
};
