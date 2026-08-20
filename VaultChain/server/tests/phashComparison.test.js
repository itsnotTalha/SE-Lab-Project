const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
	calculatePhashHammingDistance,
	findBestPhashMatch,
} = require('../src/services/hashing/phashComparisonService');

test('calculates bit-level Hamming distance rather than differing hex characters', () => {
	assert.equal(calculatePhashHammingDistance('0', 'f'), 4);
	assert.equal(calculatePhashHammingDistance('00', '03'), 2);
	assert.equal(calculatePhashHammingDistance('abcdef', 'ABCDEF'), 0);
});

test('rejects malformed or unequal-length perceptual hashes', () => {
	assert.throws(() => calculatePhashHammingDistance('', ''), /hexadecimal/i);
	assert.throws(() => calculatePhashHammingDistance('0z', '00'), /hexadecimal/i);
	assert.throws(() => calculatePhashHammingDistance('00', '0000'), /equal lengths/i);
});

test('finds the nearest candidate and safely ignores invalid stored hashes', () => {
	const match = findBestPhashMatch('0000', [
		{ assetId: 1, phash: null },
		{ assetId: 2, phash: 'ffff' },
		{ assetId: 3, phash: '0003' },
	]);
	assert.equal(match.assetId, 3);
	assert.equal(match.distance, 2);
	assert.equal(match.hashBits, 16);
});
