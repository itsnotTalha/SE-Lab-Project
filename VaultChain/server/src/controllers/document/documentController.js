const { asyncHandler } = require('../../middleware/asyncHandler');
const documentService = require('../../services/document/documentService');
const verificationService = require('../../services/verification/verificationService');

function userId(req) {
  return Number(req.user?.id);
}

function publicDocument(document) {
  if (!document) return document;
  const { filePath, ...safeDocument } = document;
  return safeDocument;
}

const upload = asyncHandler(async (req, res) => {
  const document = await documentService.uploadDocument({
    ownerId: userId(req),
    file: req.file,
    title: req.body.title,
    description: req.body.description,
    category: req.body.category,
  });
  res.status(201).json({ success: true, document: publicDocument(document) });
});

const list = asyncHandler(async (req, res) => {
  const documents = await documentService.listDocuments(userId(req));
  res.json({ success: true, documents: documents.map(publicDocument) });
});

const details = asyncHandler(async (req, res) => {
  const document = await documentService.getDocument(userId(req), req.params.id);
  res.json({ success: true, document: publicDocument(document) });
});

const runOcr = asyncHandler(async (req, res) => {
  const result = await documentService.runOcr(userId(req), req.params.id);
  res.json({
    success: true,
    confidence: result.confidence,
    text: result.extractedText,
    language: result.language,
    pagesProcessed: result.pagesProcessed,
    semanticHash: result.semanticHash,
    engine: result.engine,
  });
});

const getOcr = asyncHandler(async (req, res) => {
  const result = await documentService.getOcr(userId(req), req.params.id);
  res.json({
    success: true,
    confidence: result.confidence,
    text: result.extracted_text,
    language: result.language,
    pagesProcessed: result.pages_processed,
    semanticHash: result.semantic_hash,
    engine: result.engine,
    createdAt: result.created_at,
  });
});

const verify = asyncHandler(async (req, res) => {
  const result = await verificationService.verifyDocument(
    userId(req),
    req.params.id,
    req.body.referenceDocumentId
  );
  res.json({
    success: true,
    status: result.status,
    similarity: result.similarity,
    changesDetected: result.changesDetected,
    verification: result.verification,
  });
});

const report = asyncHandler(async (req, res) => {
  const result = await verificationService.getVerificationReport(userId(req), req.params.id);
  res.json({ success: true, report: result });
});

module.exports = { upload, list, details, runOcr, getOcr, verify, report };
