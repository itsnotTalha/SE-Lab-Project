const fs = require('fs').promises;
const path = require('path');
const {
  createDocument,
  getDocumentByIdForOwner,
  listDocumentsForOwner,
  updateDocumentProcessing,
  upsertOcrResult,
  getOcrResultForOwner,
} = require('../../repositories/document/documentRepository');
const { processPdf } = require('../ocr/ocrService');

function parsePositiveId(value, fieldName = 'ID') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error(`Invalid ${fieldName}`);
    error.status = 400;
    throw error;
  }
  return id;
}

function cleanText(value, maxLength) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text.slice(0, maxLength) : null;
}

async function uploadDocument({ ownerId, file, title, description, category }) {
  if (!file) {
    const error = new Error('PDF document is required');
    error.status = 400;
    throw error;
  }

  const safeTitle = cleanText(title, 200) || path.basename(file.originalname, path.extname(file.originalname)).slice(0, 200);
  const document = await createDocument({
    ownerId,
    title: safeTitle,
    description: cleanText(description, 2000),
    category: cleanText(category, 100),
    fileName: path.basename(file.originalname).slice(0, 255),
    filePath: file.path,
    fileSize: file.size,
    mimeType: file.mimetype,
  }).catch(async (error) => {
    await fs.unlink(file.path).catch(() => {});
    throw error;
  });

  return document;
}

async function listDocuments(ownerId) {
  return listDocumentsForOwner(ownerId);
}

async function getDocument(ownerId, documentId) {
  const id = parsePositiveId(documentId, 'document ID');
  const document = await getDocumentByIdForOwner(id, ownerId);
  if (!document) {
    const error = new Error('Document not found');
    error.status = 404;
    throw error;
  }
  return document;
}

async function runOcr(ownerId, documentId) {
  const document = await getDocument(ownerId, documentId);
  const result = await processPdf(document.filePath);
  await upsertOcrResult({
    documentId: document.id,
    extractedText: result.extractedText,
    confidence: result.confidence,
    semanticHash: result.semanticHash,
    engine: result.engine,
    language: result.language,
    pagesProcessed: result.pagesProcessed,
  });
  await updateDocumentProcessing(document.id, ownerId, {
    pageCount: result.pageCount,
    language: result.language,
    status: 'ocr_completed',
  });
  return result;
}

async function getOcr(ownerId, documentId) {
  const id = parsePositiveId(documentId, 'document ID');
  const result = await getOcrResultForOwner(id, ownerId);
  if (!result) {
    const error = new Error('OCR result not found; run OCR first');
    error.status = 404;
    throw error;
  }
  return result;
}

module.exports = {
  parsePositiveId,
  uploadDocument,
  listDocuments,
  getDocument,
  runOcr,
  getOcr,
};
