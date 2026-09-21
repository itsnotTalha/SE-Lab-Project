const crypto = require('crypto');

function normalizeDocumentText(value) {
	return String(value || '')
		.normalize('NFKC')
		.replace(/\s+/g, ' ')
		.trim()
		.toLocaleLowerCase('en-US');
}

function createSemanticHash(text) {
	const normalizedText = normalizeDocumentText(text);
	if (!normalizedText) return null;
	return crypto.createHash('sha256').update(normalizedText, 'utf8').digest('hex');
}

module.exports = { normalizeDocumentText, createSemanticHash };
