const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');

const execFileAsync = promisify(execFile);

function normalizeText(text) {
  return String(text || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateSemanticHash(text) {
  return crypto.createHash('sha256').update(normalizeText(text), 'utf8').digest('hex');
}

async function extractPdfText(pdfPath) {
  try {
    const { stdout: text } = await execFileAsync('pdftotext', ['-layout', pdfPath, '-'], { maxBuffer: 1024 * 1024 * 20 });
    let pageCount = 0;
    try {
      const { stdout: info } = await execFileAsync('pdfinfo', [pdfPath]);
      const match = info.match(/^Pages:\s+(\d+)/m);
      pageCount = match ? Number(match[1]) : 0;
    } catch {
      pageCount = 0;
    }
    return { text: text || '', pageCount, engine: 'pdftotext' };
  } catch (systemError) {
    try {
      const buffer = await fs.promises.readFile(pdfPath);
      const parsed = await pdfParse(buffer);
      return { text: parsed.text || '', pageCount: parsed.numpages || 0, engine: 'pdf-parse' };
    } catch {
      throw systemError;
    }
  }
}

async function renderPdfPages(pdfPath, outputDirectory) {
  const prefix = path.join(outputDirectory, 'page');
  await execFileAsync('pdftoppm', ['-png', '-r', '180', pdfPath, prefix], { maxBuffer: 1024 * 1024 * 10 });
  const files = (await fs.promises.readdir(outputDirectory))
    .filter((file) => file.startsWith('page-') && file.endsWith('.png'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return files.map((file) => path.join(outputDirectory, file));
}

async function runOcrOnPages(pagePaths) {
  const worker = await createWorker('eng');
  const pageTexts = [];
  const confidences = [];

  try {
    for (const pagePath of pagePaths) {
      const result = await worker.recognize(pagePath);
      pageTexts.push(result.data.text || '');
      if (Number.isFinite(result.data.confidence)) {
        confidences.push(Number(result.data.confidence));
      }
    }
  } finally {
    await worker.terminate();
  }

  return {
    text: pageTexts.join('\n\n'),
    confidence: confidences.length
      ? Number((confidences.reduce((sum, value) => sum + value, 0) / confidences.length).toFixed(2))
      : null,
  };
}

async function processPdf(pdfPath) {
  const extracted = await extractPdfText(pdfPath);
  let text = extracted.text;
  let confidence = null;
  let pagesProcessed = extracted.pageCount;
  let engine = extracted.engine || 'pdf-parse';

  if (normalizeText(text).length < 20) {
    const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vaultchain-ocr-'));
    try {
      const pagePaths = await renderPdfPages(pdfPath, temporaryDirectory);
      const ocr = await runOcrOnPages(pagePaths);
      text = ocr.text;
      confidence = ocr.confidence;
      pagesProcessed = pagePaths.length || extracted.pageCount;
      engine = 'pdf-parse+tesseract.js';
    } finally {
      await fs.promises.rm(temporaryDirectory, { recursive: true, force: true });
    }
  } else {
    confidence = 100;
  }

  const normalizedText = normalizeText(text);
  if (!normalizedText) {
    const error = new Error('OCR produced no readable text');
    error.status = 422;
    throw error;
  }

  return {
    extractedText: text.trim(),
    normalizedText,
    confidence,
    semanticHash: calculateSemanticHash(normalizedText),
    pageCount: extracted.pageCount || pagesProcessed,
    pagesProcessed,
    language: 'eng',
    engine,
  };
}

module.exports = {
  normalizeText,
  calculateSemanticHash,
  processPdf,
};
