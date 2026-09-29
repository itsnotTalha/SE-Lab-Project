const { test } = require('node:test');
const assert = require('node:assert/strict');
const { extractAutomatically } = require('../src/services/ocr/autoOcrService');
const input = { filePath: '/unused/note.png', mimeType: 'image/png' };
const local = { text: 'Readable printed document', confidence: 96 };
function dependencies(result, overrides = {}) {
	return { localExtract: async () => result, onlineConfigured: () => true,
		onlineExtract: async () => { throw new Error('Unexpected online request'); }, ...overrides };
}
test('clear local text never calls online OCR', async () => {
	const result = await extractAutomatically(input, dependencies(local));
	assert.equal(result.source, 'local_tesseract');
	assert.equal(result.warning, null);
});
test('low-confidence, empty, missing-confidence and noisy text use online OCR', async () => {
	for (const result of [{ text: 'unclear', confidence: 20 }, { text: '', confidence: 99 }, { text: 'note', confidence: null }, { text: '!! / | = @', confidence: 99 }]) {
		let called = false;
		const actual = await extractAutomatically(input, dependencies(result, { onlineExtract: async (value) => { called = true; assert.deepEqual(value, input); return { text: 'বাংলা', source: 'gemini_api', confidence: null }; } }));
		assert.ok(called);
		assert.equal(actual.source, 'gemini_api');
		assert.equal(actual.confidence, null);
	}
});
test('a local engine failure can be recovered online', async () => {
	const result = await extractAutomatically(input, dependencies(null, { localExtract: async () => { throw new Error('worker failure'); }, onlineExtract: async () => ({ text: 'Recovered', source: 'gemini_api' }) }));
	assert.equal(result.selectionReason, 'local_ocr_failed');
});
test('without configuration, unclear local output includes a review warning', async () => {
	const result = await extractAutomatically(input, dependencies({ text: 'partial', confidence: 30 }, { onlineConfigured: () => false }));
	assert.equal(result.source, 'local_tesseract');
	assert.match(result.warning, /not configured/);
});
test('an online failure retains available local text with a warning', async () => {
	const result = await extractAutomatically(input, dependencies({ text: 'partial', confidence: 30 }));
	assert.equal(result.text, 'partial');
	assert.match(result.warning, /Online OCR was unavailable/);
});
test('an online failure with no local text remains retryable instead of reporting success', async () => {
	await assert.rejects(extractAutomatically(input, dependencies({ text: '', confidence: 0 })), /Unexpected online request/);
});
