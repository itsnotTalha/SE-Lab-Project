const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { createWorker } = require('tesseract.js');
const englishData = require('@tesseract.js-data/eng');

const execFileAsync = promisify(execFile);
const MAX_SCANNED_PDF_PAGES = 10;
const COMMAND_OPTIONS = { maxBuffer: 25 * 1024 * 1024, timeout: 120000 };

async function validateImage(filePath, mimeType) {
	const handle = await fs.open(filePath, 'r');
	try {
		const signature = Buffer.alloc(8);
		const { bytesRead } = await handle.read(signature, 0, signature.length, 0);
		const isPng = bytesRead === 8 && signature.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
		const isJpeg = bytesRead >= 3 && signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
		if ((mimeType === 'image/png' && !isPng) || (mimeType === 'image/jpeg' && !isJpeg)) {
			throw new Error('Invalid image data');
		}
	} finally {
		await handle.close();
	}
}

async function imageText(filePath) {
	const worker = await createWorker(englishData.code, 1, {
		langPath: englishData.langPath,
		gzip: englishData.gzip,
		cacheMethod: 'readOnly',
	});
	try {
		const result = await worker.recognize(filePath);
		return { text: String(result.data.text || '').trim(), confidence: result.data.confidence ?? null };
	} finally {
		await worker.terminate();
	}
}

async function pdfPageCount(filePath) {
	const { stdout } = await execFileAsync('pdfinfo', [filePath], COMMAND_OPTIONS);
	const match = stdout.match(/^Pages:\s+(\d+)/m);
	return match ? Number(match[1]) : null;
}

async function pdfText(filePath) {
	const { stdout } = await execFileAsync('pdftotext', ['-layout', filePath, '-'], COMMAND_OPTIONS);
	return stdout.trim();
}

async function renderPdfFirstPage(filePath) {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'vaultchain-pdf-preview-'));
	try {
		const outputPath = path.join(directory, 'preview');
		await execFileAsync('pdftoppm', ['-png', '-r', '150', '-f', '1', '-singlefile', filePath, outputPath], COMMAND_OPTIONS);
		return await fs.readFile(`${outputPath}.png`);
	} finally {
		await fs.rm(directory, { recursive: true, force: true });
	}
}

function pageNumber(fileName) {
	return Number(fileName.match(/-(\d+)\.png$/)?.[1] || 0);
}

async function scannedPdfText(filePath, pageCount) {
	if (pageCount && pageCount > MAX_SCANNED_PDF_PAGES) {
		throw new Error(`Scanned PDF OCR is limited to ${MAX_SCANNED_PDF_PAGES} pages`);
	}
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'vaultchain-pdf-ocr-'));
	try {
		const prefix = path.join(directory, 'page');
		await execFileAsync('pdftoppm', ['-png', '-r', '150', filePath, prefix], COMMAND_OPTIONS);
		const pages = (await fs.readdir(directory)).filter((name) => name.endsWith('.png')).sort((a, b) => pageNumber(a) - pageNumber(b));
		const results = [];
		for (const page of pages) results.push(await imageText(path.join(directory, page)));
		const confidences = results.map((result) => Number(result.confidence)).filter(Number.isFinite);
		return {
			text: results.map((result) => result.text).filter(Boolean).join('\n\n'),
			confidence: confidences.length ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length : null,
		};
	} finally {
		await fs.rm(directory, { recursive: true, force: true });
	}
}

async function extractDocumentText({ filePath, mimeType }) {
	if (mimeType !== 'application/pdf') {
		await validateImage(filePath, mimeType);
		const result = await imageText(filePath);
		return { ...result, pageCount: 1, language: 'eng' };
	}
	const pageCount = await pdfPageCount(filePath);
	let embeddedText = '';
	try {
		embeddedText = await pdfText(filePath);
	} catch {
		// Some deployments do not provide pdftotext. Render and OCR the PDF instead.
		embeddedText = '';
	}
	if (embeddedText.length >= 10) {
		return { text: embeddedText, confidence: null, pageCount, language: 'eng' };
	}
	return { ...(await scannedPdfText(filePath, pageCount)), pageCount, language: 'eng' };
}

module.exports = { extractDocumentText, renderPdfFirstPage };
