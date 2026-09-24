const fs = require('fs/promises');
const fsSync = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const COMMAND_OPTIONS = { maxBuffer: 25 * 1024 * 1024, timeout: 180000 };

function getPythonPath() {
	const localVenvPython = path.resolve(__dirname, '../../../htr_env/bin/python3');
	if (fsSync.existsSync(localVenvPython)) {
		return localVenvPython;
	}
	return 'python3';
}

function parseJsonFromOutput(stdout) {
	const lines = stdout.trim().split('\n');
	for (let i = lines.length - 1; i >= 0; i--) {
		const line = lines[i].trim();
		if (line.startsWith('{') && line.endsWith('}')) {
			try {
				return JSON.parse(line);
			} catch {
				// Continue searching earlier lines
			}
		}
	}
	throw new Error(`Failed to parse TrOCR output: ${stdout.slice(-200)}`);
}

async function extractHandwrittenFromImage(imagePath) {
	const pythonPath = getPythonPath();
	const scriptPath = path.resolve(__dirname, 'trocrService.py');

	const { stdout } = await execFileAsync(pythonPath, [scriptPath, imagePath], COMMAND_OPTIONS);
	const data = parseJsonFromOutput(stdout);

	if (data.error) {
		throw new Error(`TrOCR error: ${data.error}`);
	}

	return {
		text: String(data.text || '').trim(),
		confidence: typeof data.confidence === 'number' ? data.confidence : null,
		engine: 'TrOCR (microsoft/trocr-base-handwritten)',
	};
}

function pageNumber(fileName) {
	return Number(fileName.match(/-(\d+)\.png$/)?.[1] || 0);
}

async function extractHandwrittenFromPdf(filePath, pageCount = 1) {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'vaultchain-htr-pdf-'));
	try {
		const prefix = path.join(directory, 'page');
		await execFileAsync('pdftoppm', ['-png', '-r', '150', filePath, prefix], COMMAND_OPTIONS);
		const pages = (await fs.readdir(directory)).filter((name) => name.endsWith('.png')).sort((a, b) => pageNumber(a) - pageNumber(b));
		const results = [];
		for (const page of pages) {
			results.push(await extractHandwrittenFromImage(path.join(directory, page)));
		}
		const confidences = results.map((r) => Number(r.confidence)).filter(Number.isFinite);
		return {
			text: results.map((r) => r.text).filter(Boolean).join('\n\n'),
			confidence: confidences.length ? confidences.reduce((sum, v) => sum + v, 0) / confidences.length : null,
			engine: 'TrOCR (microsoft/trocr-base-handwritten)',
		};
	} finally {
		await fs.rm(directory, { recursive: true, force: true });
	}
}

async function extractHandwrittenText({ filePath, mimeType, pageCount = 1 }) {
	if (mimeType === 'application/pdf') {
		return extractHandwrittenFromPdf(filePath, pageCount);
	}
	return extractHandwrittenFromImage(filePath);
}

module.exports = {
	extractHandwrittenText,
	extractHandwrittenFromImage,
	extractHandwrittenFromPdf,
};
