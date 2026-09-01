const { run } = require('../../database/database');
const { database } = require('../../database/database');

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows || []);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    database.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row || null);
    });
  });
}

function mapDocument(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    category: row.category,
    originalName: row.file_name,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    pageCount: row.page_count,
    language: row.language,
    status: row.status,
    uploadedAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createDocument({ ownerId, title, description, category, fileName, filePath, fileSize, mimeType }) {
  const result = await run(
    `INSERT INTO documents (owner_id, title, description, category, file_name, file_path, file_size, mime_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [ownerId, title, description || null, category || null, fileName, filePath, fileSize, mimeType]
  );
  return getDocumentByIdForOwner(result.lastID, ownerId);
}

async function getDocumentByIdForOwner(documentId, ownerId) {
  const row = await get(
    `SELECT id, owner_id, title, description, category, file_name, file_size, mime_type,
            file_path, page_count, language, status, created_at, updated_at
       FROM documents
      WHERE id = ? AND owner_id = ?`,
    [documentId, ownerId]
  );
  return row ? { ...mapDocument(row), filePath: row.file_path } : null;
}

async function listDocumentsForOwner(ownerId) {
  const rows = await all(
    `SELECT id, owner_id, title, description, category, file_name, file_size, mime_type,
            page_count, language, status, created_at, updated_at
       FROM documents
      WHERE owner_id = ?
      ORDER BY created_at DESC, id DESC`,
    [ownerId]
  );
  return rows.map(mapDocument);
}

async function updateDocumentProcessing(documentId, ownerId, { pageCount, language, status }) {
  await run(
    `UPDATE documents
        SET page_count = COALESCE(?, page_count),
            language = COALESCE(?, language),
            status = COALESCE(?, status),
            updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND owner_id = ?`,
    [pageCount ?? null, language || null, status || null, documentId, ownerId]
  );
}

async function upsertOcrResult({ documentId, extractedText, confidence, semanticHash, engine, language, pagesProcessed }) {
  await run(
    `INSERT INTO ocr_results
      (document_id, extracted_text, confidence, semantic_hash, engine, language, pages_processed)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(document_id) DO UPDATE SET
       extracted_text = excluded.extracted_text,
       confidence = excluded.confidence,
       semantic_hash = excluded.semantic_hash,
       engine = excluded.engine,
       language = excluded.language,
       pages_processed = excluded.pages_processed,
       created_at = CURRENT_TIMESTAMP`,
    [documentId, extractedText, confidence, semanticHash, engine, language, pagesProcessed]
  );
}

async function getOcrResultForOwner(documentId, ownerId) {
  return get(
    `SELECT o.id, o.document_id, o.extracted_text, o.confidence, o.semantic_hash,
            o.engine, o.language, o.pages_processed, o.created_at
       FROM ocr_results o
       JOIN documents d ON d.id = o.document_id
      WHERE o.document_id = ? AND d.owner_id = ?`,
    [documentId, ownerId]
  );
}

async function createVerification({ documentId, verifiedBy, status, similarity, changesDetected, comparisonSource, referenceDocumentId, baselineSemanticHash, currentSemanticHash, engine, confidence, details }) {
  const result = await run(
    `INSERT INTO document_verifications
      (document_id, verified_by, status, similarity, changes_detected, comparison_source,
       reference_document_id, baseline_semantic_hash, current_semantic_hash, engine, confidence, details_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [documentId, verifiedBy, status, similarity ?? null, changesDetected ? 1 : 0, comparisonSource || null,
      referenceDocumentId ?? null, baselineSemanticHash || null, currentSemanticHash || null,
      engine || null, confidence ?? null, details ? JSON.stringify(details) : null]
  );
  return getVerificationForOwner(result.lastID, verifiedBy);
}

async function getLatestVerificationForOwner(documentId, ownerId) {
  const row = await get(
    `SELECT v.*
       FROM document_verifications v
       JOIN documents d ON d.id = v.document_id
      WHERE v.document_id = ? AND d.owner_id = ?
      ORDER BY v.created_at DESC, v.id DESC
      LIMIT 1`,
    [documentId, ownerId]
  );
  return mapVerification(row);
}

async function getVerificationForOwner(verificationId, ownerId) {
  const row = await get(
    `SELECT v.*
       FROM document_verifications v
       JOIN documents d ON d.id = v.document_id
      WHERE v.id = ? AND d.owner_id = ?`,
    [verificationId, ownerId]
  );
  return mapVerification(row);
}

function mapVerification(row) {
  if (!row) return null;
  let details = null;
  if (row.details_json) {
    try { details = JSON.parse(row.details_json); } catch { details = null; }
  }
  return {
    id: row.id,
    documentId: row.document_id,
    verifiedBy: row.verified_by,
    status: row.status,
    similarity: row.similarity,
    changesDetected: Boolean(row.changes_detected),
    comparisonSource: row.comparison_source,
    referenceDocumentId: row.reference_document_id,
    baselineSemanticHash: row.baseline_semantic_hash,
    currentSemanticHash: row.current_semantic_hash,
    engine: row.engine,
    confidence: row.confidence,
    details,
    verifiedAt: row.created_at,
  };
}

module.exports = {
  createDocument,
  getDocumentByIdForOwner,
  listDocumentsForOwner,
  updateDocumentProcessing,
  upsertOcrResult,
  getOcrResultForOwner,
  createVerification,
  getLatestVerificationForOwner,
};
