const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const gemini = require('../src/services/ocr/geminiOcrService');
const { extractDocumentText } = require('../src/services/ocr/ocrService');

const envKeys = ['GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_FALLBACK_MODELS', 'GEMINI_OCR_TIMEOUT_MS', 'ENABLE_GEMINI_TESTS', 'NODE_ENV'];
let originalEnv;
let originalFetch;
let directory;
let filePath;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG1cAAAAASUVORK5CYII=', 'base64');
const result = (parts = [{ text: 'Handwritten note' }], finishReason = 'STOP') => new Response(JSON.stringify({ candidates: [{ finishReason, content: { parts } }] }), { status: 200 });
const extract = () => gemini.extractTextWithGemini({ filePath, mimeType: 'image/png' });

before(async () => {
	directory = await fs.mkdtemp(path.join(os.tmpdir(), 'vaultchain-gemini-test-'));
	filePath = path.join(directory, 'note.png');
	await fs.writeFile(filePath, png);
});
after(async () => { await fs.rm(directory, { recursive: true, force: true }); });
beforeEach(() => {
	originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
	originalFetch = global.fetch;
	Object.assign(process.env, { GEMINI_API_KEY: 'test-key-never-real', GEMINI_MODEL: 'test-model', GEMINI_FALLBACK_MODELS: 'test-fallback', GEMINI_OCR_TIMEOUT_MS: '1000', ENABLE_GEMINI_TESTS: 'true', NODE_ENV: 'test' });
	global.fetch = async () => { throw new Error('Unexpected request: tests must mock every response'); };
});
afterEach(() => {
	global.fetch = originalFetch;
	for (const [key, value] of Object.entries(originalEnv)) {
		if (value === undefined) delete process.env[key]; else process.env[key] = value;
	}
});

test('tests require explicit opt-in, and a blank key never configures Gemini', async () => {
	for (const flag of ['false', '0', '']) {
		process.env.ENABLE_GEMINI_TESTS = flag;
		assert.equal(gemini.isGeminiConfigured(), false);
		await assert.rejects(extract(), { code: 'NO_GEMINI_KEY' });
	}
	process.env.ENABLE_GEMINI_TESTS = 'true';
	process.env.GEMINI_API_KEY = '  ';
	assert.equal(gemini.isGeminiConfigured(), false);
});

test('image pipeline returns Bengali and English transcription with no fabricated confidence', async () => {
	global.fetch = async (url, options) => {
		assert.ok(!url.includes('test-key-never-real'));
		assert.equal(options.headers['x-goog-api-key'], 'test-key-never-real');
		const body = JSON.parse(options.body);
		assert.match(body.systemInstruction.parts[0].text, /sole task is to transcribe/);
		assert.equal(body.contents[0].parts[0].inline_data.mime_type, 'image/png');
		assert.equal(body.contents[0].parts[0].inline_data.data, png.toString('base64'));
		return result([{ text: 'Internal reasoning', thought: true }, { text: 'বাংলা নোট' }, { text: 'Address/Data Bus' }]);
	};
	const extracted = await extractDocumentText({ filePath, mimeType: 'image/png' });
	assert.equal(extracted.text, 'বাংলা নোট\nAddress/Data Bus');
	assert.equal(extracted.language, 'ben+eng');
	assert.equal(extracted.pageCount, 1);
	assert.equal(extracted.source, 'gemini_api');
	assert.equal(extracted.confidence, null);
});

test('transient API errors use fallback models with one shared deadline', async () => {
	const calls = [];
	global.fetch = async (url, options) => {
		calls.push({ url, signal: options.signal });
		return calls.length === 1 ? new Response('temporary', { status: 503 }) : result();
	};
	assert.equal((await extract()).model, 'test-fallback');
	assert.equal(calls.length, 2);
	assert.equal(calls[0].signal, calls[1].signal);
});

test('authentication failures stop immediately without exposing response bodies', async () => {
	let calls = 0;
	global.fetch = async () => { calls++; return new Response('secret provider detail', { status: 403 }); };
	await assert.rejects(extract(), (error) => error.status === 403 && !error.message.includes('secret'));
	assert.equal(calls, 1);
});

test('fallback exhaustion is bounded and retains the final status', async () => {
	process.env.GEMINI_FALLBACK_MODELS = 'test-model,one,two,three';
	let calls = 0;
	global.fetch = async () => { calls++; return new Response('', { status: 429 }); };
	await assert.rejects(extract(), { status: 429 });
	assert.equal(calls, 3);
});

test('blocked, truncated, malformed and empty results cannot be saved as completed OCR', async () => {
	for (const response of [
		result([{ text: 'partial transcription' }], 'MAX_TOKENS'),
		new Response(JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' } })),
		new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP' }] })),
		result([{ text: ' ' }]),
	]) {
		global.fetch = async () => response;
		await assert.rejects(extract(), (error) => ['GEMINI_INCOMPLETE_RESPONSE', 'GEMINI_EMPTY_RESPONSE'].includes(error.code));
	}
});

test('timeouts propagate without multiplying fallback attempts', async () => {
	let calls = 0;
	global.fetch = async () => { calls++; throw new DOMException('Deadline exceeded', 'TimeoutError'); };
	await assert.rejects(extract(), { name: 'TimeoutError' });
	assert.equal(calls, 1);
});

test('PDFs and oversized images are rejected by the image-only Gemini service before requests', async () => {
	await assert.rejects(gemini.extractTextWithGemini({ filePath, mimeType: 'application/pdf' }), { code: 'GEMINI_UNSUPPORTED_TYPE' });
	const largeFile = path.join(directory, 'large.png');
	await fs.writeFile(largeFile, '');
	await fs.truncate(largeFile, 14 * 1024 * 1024 + 1);
	await assert.rejects(gemini.extractTextWithGemini({ filePath: largeFile, mimeType: 'image/png' }), { code: 'GEMINI_IMAGE_TOO_LARGE' });
});

test('invalid image signatures never reach the Gemini API', async () => {
	const invalid = path.join(directory, 'invalid.png');
	await fs.writeFile(invalid, 'not an image');
	await assert.rejects(extractDocumentText({ filePath: invalid, mimeType: 'image/png' }), /Invalid image data/);
});
