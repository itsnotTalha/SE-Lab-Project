function readThreshold(name, fallback) {
	const value = Number.parseInt(process.env[name], 10);
	return Number.isInteger(value) && value >= 0 ? value : fallback;
}

const strongMatchMax = readThreshold('PHASH_STRONG_MATCH_MAX', 6);
const possibleMatchMax = Math.max(
	strongMatchMax,
	readThreshold('PHASH_POSSIBLE_MATCH_MAX', 12)
);

module.exports = Object.freeze({
	STRONG_MATCH_MAX: strongMatchMax,
	POSSIBLE_MATCH_MAX: possibleMatchMax,
});
