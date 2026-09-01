const {
  getDocumentByIdForOwner,
  getOcrResultForOwner,
  createVerification,
  getLatestVerificationForOwner,
} = require('../../repositories/document/documentRepository');
const { parsePositiveId } = require('../document/documentService');
const { normalizeText } = require('../ocr/ocrService');

function tokenFrequency(text) {
  const frequencies = new Map();
  for (const token of normalizeText(text).split(' ').filter(Boolean)) {
    frequencies.set(token, (frequencies.get(token) || 0) + 1);
  }
  return frequencies;
}

function cosineSimilarity(leftText, rightText) {
  const left = tokenFrequency(leftText);
  const right = tokenFrequency(rightText);
  if (!left.size || !right.size) return null;

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (const value of left.values()) leftMagnitude += value * value;
  for (const value of right.values()) rightMagnitude += value * value;
  for (const [token, value] of left.entries()) dot += value * (right.get(token) || 0);

  const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
  return denominator ? dot / denominator : null;
}

function jaccardSimilarity(leftText, rightText) {
  const left = new Set(normalizeText(leftText).split(' ').filter(Boolean));
  const right = new Set(normalizeText(rightText).split(' ').filter(Boolean));
  if (!left.size || !right.size) return null;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : null;
}

function compareTexts(currentText, referenceText) {
  const cosine = cosineSimilarity(currentText, referenceText);
  const jaccard = jaccardSimilarity(currentText, referenceText);
  if (cosine == null || jaccard == null) return null;

  const similarity = Number((((cosine * 0.7) + (jaccard * 0.3)) * 100).toFixed(2));
  let status = 'Unknown';
  if (similarity >= 98) status = 'Original';
  else if (similarity >= 40) status = 'Modified';

  return {
    similarity,
    status,
    changesDetected: status === 'Modified',
    metrics: {
      cosineSimilarity: Number((cosine * 100).toFixed(2)),
      jaccardSimilarity: Number((jaccard * 100).toFixed(2)),
    },
  };
}

async function verifyDocument(ownerId, documentId, referenceDocumentId) {
  const currentId = parsePositiveId(documentId, 'document ID');
  const currentDocument = await getDocumentByIdForOwner(currentId, ownerId);
  if (!currentDocument) {
    const error = new Error('Document not found');
    error.status = 404;
    throw error;
  }

  const currentOcr = await getOcrResultForOwner(currentId, ownerId);
  if (!currentOcr || !normalizeText(currentOcr.extracted_text)) {
    const error = new Error('Current document has no usable OCR result; run OCR first');
    error.status = 422;
    throw error;
  }

  const referenceId = referenceDocumentId == null || referenceDocumentId === ''
    ? null
    : parsePositiveId(referenceDocumentId, 'reference document ID');

  let comparison = null;
  let referenceOcr = null;
  if (referenceId != null && referenceId !== currentId) {
    const referenceDocument = await getDocumentByIdForOwner(referenceId, ownerId);
    if (referenceDocument) referenceOcr = await getOcrResultForOwner(referenceId, ownerId);
    if (referenceOcr?.extracted_text) comparison = compareTexts(currentOcr.extracted_text, referenceOcr.extracted_text);
  }

  const result = comparison || {
    similarity: null,
    status: 'Unknown',
    changesDetected: false,
    metrics: null,
  };

  const verification = await createVerification({
    documentId: currentId,
    verifiedBy: ownerId,
    status: result.status,
    similarity: result.similarity,
    changesDetected: result.changesDetected,
    comparisonSource: referenceOcr ? 'ocr_text' : 'reference_unavailable',
    referenceDocumentId: referenceId,
    baselineSemanticHash: referenceOcr?.semantic_hash || null,
    currentSemanticHash: currentOcr.semantic_hash,
    engine: 'normalized-text-cosine-jaccard',
    confidence: currentOcr.confidence,
    details: {
      comparison: result.metrics,
      referenceAvailable: Boolean(referenceOcr?.extracted_text),
      referenceDocumentId: referenceId,
    },
  });

  return {
    status: result.status,
    similarity: result.similarity,
    changesDetected: result.changesDetected,
    verification,
  };
}

async function getVerificationReport(ownerId, documentId) {
  const id = parsePositiveId(documentId, 'document ID');
  const document = await getDocumentByIdForOwner(id, ownerId);
  if (!document) {
    const error = new Error('Document not found');
    error.status = 404;
    throw error;
  }
  const ocr = await getOcrResultForOwner(id, ownerId);
  const verification = await getLatestVerificationForOwner(id, ownerId);
  return {
    document: {
      id: document.id,
      title: document.title,
      originalName: document.originalName,
      pageCount: document.pageCount,
      language: document.language,
      uploadedAt: document.uploadedAt,
    },
    verification,
    ocr: ocr ? {
      confidence: ocr.confidence,
      semanticHash: ocr.semantic_hash,
      engine: ocr.engine,
      language: ocr.language,
      pagesProcessed: ocr.pages_processed,
      createdAt: ocr.created_at,
      textLength: (ocr.extracted_text || '').length,
    } : null,
    comparison: verification?.details?.comparison || null,
  };
}

module.exports = {
  compareTexts,
  verifyDocument,
  getVerificationReport,
};
