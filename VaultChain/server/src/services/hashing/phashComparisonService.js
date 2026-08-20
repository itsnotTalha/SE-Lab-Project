const BIT_COUNTS = Object.freeze([0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4]);

function normalizePhash(hash) {
	if (typeof hash !== 'string' || !/^[0-9a-f]+$/i.test(hash)) {
		throw new TypeError('Perceptual hash must be a non-empty hexadecimal string');
	}
	return hash.toLowerCase();
}

function calculatePhashHammingDistance(firstHash, secondHash) {
	const first = normalizePhash(firstHash);
	const second = normalizePhash(secondHash);
	if (first.length !== second.length) {
		throw new TypeError('Perceptual hashes must have equal lengths');
	}

	let distance = 0;
	for (let index = 0; index < first.length; index += 1) {
		const xor = Number.parseInt(first[index], 16) ^ Number.parseInt(second[index], 16);
		distance += BIT_COUNTS[xor];
	}
	return distance;
}

function findBestPhashMatch(targetHash, candidates) {
	const normalizedTarget = normalizePhash(targetHash);
	let bestMatch = null;

	for (const candidate of candidates || []) {
		try {
			const distance = calculatePhashHammingDistance(normalizedTarget, candidate.phash);
			if (!bestMatch || distance < bestMatch.distance) {
				bestMatch = { ...candidate, distance, hashBits: normalizedTarget.length * 4 };
			}
		} catch {
			// Old or incomplete rows must not prevent valid candidates from being checked.
		}
	}

	return bestMatch;
}

module.exports = {
	normalizePhash,
	calculatePhashHammingDistance,
	findBestPhashMatch,
};
