const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { createWorker } = require('tesseract.js');
const englishData = require('@tesseract.js-data/eng');
const geminiOcrService = require('./geminiOcrService');
const { extractAutomatically } = require('./autoOcrService');

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
		// recognize() already rejects; suppress the library's separate uncaught throw.
		errorHandler: () => {},
	});
	try {
		await worker.setParameters({ preserve_interword_spaces: '1' });
		const result = await worker.recognize(filePath);
		return { text: String(result.data.text || ''), confidence: result.data.confidence ?? null };
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
	return stdout;
}


async function validateDocumentFile(filePath, mimeType) {
	try {
		if (mimeType === 'application/pdf') {
			const handle = await fs.open(filePath, 'r');
			try {
				const signature = Buffer.alloc(5);
				await handle.read(signature, 0, 5, 0);
				if (signature.toString() !== '%PDF-') throw new Error('Invalid PDF');
			} finally { await handle.close(); }
			const pages = await pdfPageCount(filePath);
			if (!pages || pages > 200) throw new Error('PDF must contain 1 to 200 pages');
		} else {
			if (!['image/png', 'image/jpeg'].includes(mimeType)) throw new Error('Unsupported image');
			await validateImage(filePath, mimeType);
		}
	} catch (cause) {
		const error = new Error(cause.code === 'ENOENT'
			? 'PDF processing tools are unavailable. Install poppler-utils on the server.'
			: 'Invalid document. Upload a valid PDF (up to 200 pages), PNG, or JPEG.');
		error.status = cause.code === 'ENOENT' ? 503 : 400;
		throw error;
	}
}

async function extractDocumentText({ filePath, mimeType }) {
	if (mimeType !== 'application/pdf') {
		await validateImage(filePath, mimeType);
		const result = await extractAutomatically({ filePath, mimeType }, {
			localExtract: imageText,
			onlineConfigured: geminiOcrService.isGeminiConfigured,
			onlineExtract: geminiOcrService.extractTextWithGemini,
		});
		return { ...result, pageCount: 1, language: /[\u0980-\u09FF]/.test(result.text) ? 'ben+eng' : 'eng' };
	}
	const pageCount = await pdfPageCount(filePath);
	if (!pageCount || pageCount > 200) throw new Error('PDF must contain 1 to 200 pages');
	// Poppler preserves columns and separates pages with form feeds. Do not trim
	// leading whitespace, flatten paragraphs, or skip scans in mixed PDFs.
	const embeddedPages = (await pdfText(filePath)).split('\f');
	const pages = Array.from({ length: pageCount }, (_, index) => embeddedPages[index] || '');
	const scanIndexes = pages.flatMap((text, index) => text.trim() ? [] : [index]);
	if (scanIndexes.length > MAX_SCANNED_PDF_PAGES) {
		throw new Error(`Scanned PDF OCR is limited to ${MAX_SCANNED_PDF_PAGES} pages`);
	}
	const confidences = [];
	if (scanIndexes.length) {
		const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'vaultchain-pdf-ocr-'));
		try {
			for (const index of scanIndexes) {
				const prefix = path.join(directory, `page-${index}`);
				await execFileAsync('pdftoppm', ['-png', '-singlefile', '-f', String(index + 1), '-l', String(index + 1), '-r', '150', filePath, prefix], COMMAND_OPTIONS);
				const result = await imageText(`${prefix}.png`);
				pages[index] = result.text;
				if (Number.isFinite(result.confidence)) confidences.push(result.confidence);
				await fs.unlink(`${prefix}.png`);
			}
		} finally { await fs.rm(directory, { recursive: true, force: true }); }
	}
	const text = pages.join('\f');
	return {
		text, pageCount, source: 'local_pdf', selectionReason: 'pdf_local_extraction', warning: null,
		language: /[\u0980-\u09FF]/.test(text) ? 'ben+eng' : 'eng',
		confidence: confidences.length ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length : null,
	};
}

module.exports = { extractDocumentText, validateDocumentFile };
