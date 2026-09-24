const crypto = require('crypto');

/**
 * Normalizes text to ensure deterministic hashing across formatting differences.
 * Collapses whitespace, removes non-printable characters, trims, and converts to lowercase.
 */
function normalizeText(rawText) {
	if (!rawText || typeof rawText !== 'string') return '';
	return rawText
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
		.replace(/\r\n|\r|\n/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();
}

/**
 * Computes SHA-256 hash of normalized text for content duplicate detection.
 */
function generateTextSha256(text) {
	const normalized = normalizeText(text);
	if (!normalized) return null;
	return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Calculates token-level Jaccard similarity between two texts.
 * Returns score between 0.0 (completely distinct) and 1.0 (identical tokens).
 */
function calculateTextSimilarity(text1, text2) {
	const normalized1 = normalizeText(text1);
	const normalized2 = normalizeText(text2);

	if (!normalized1 && !normalized2) return 1.0;
	if (!normalized1 || !normalized2) return 0.0;
	if (normalized1 === normalized2) return 1.0;

	const tokens1 = new Set(normalized1.split(' ').filter(Boolean));
	const tokens2 = new Set(normalized2.split(' ').filter(Boolean));

	if (tokens1.size === 0 && tokens2.size === 0) return 1.0;
	if (tokens1.size === 0 || tokens2.size === 0) return 0.0;

	let intersectionCount = 0;
	for (const token of tokens1) {
		if (tokens2.has(token)) intersectionCount++;
	}

	const unionCount = tokens1.size + tokens2.size - intersectionCount;
	return unionCount === 0 ? 1.0 : Number((intersectionCount / unionCount).toFixed(4));
}

/**
 * Detects word-level differences between original and comparison texts.
 */
function findTextDifferences(originalText, comparisonText) {
	const originalWords = normalizeText(originalText).split(' ').filter(Boolean);
	const comparisonWords = normalizeText(comparisonText).split(' ').filter(Boolean);

	const originalSet = new Set(originalWords);
	const comparisonSet = new Set(comparisonWords);

	const removedWords = originalWords.filter((w) => !comparisonSet.has(w));
	const addedWords = comparisonWords.filter((w) => !originalSet.has(w));

	return {
		removedWords: [...new Set(removedWords)].slice(0, 30),
		addedWords: [...new Set(addedWords)].slice(0, 30),
		wordCountDifference: comparisonWords.length - originalWords.length,
	};
}

module.exports = {
	normalizeText,
	generateTextSha256,
	calculateTextSimilarity,
	findTextDifferences,
};
