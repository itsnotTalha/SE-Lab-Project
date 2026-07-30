const fs = require('fs/promises');
const crypto = require('crypto');

function normalizeValue(value) {
	if (value instanceof Date) {
		return value.toISOString();
	}

	if (Array.isArray(value)) {
		return value.map((item) => normalizeValue(item));
	}

	if (value && typeof value === 'object') {
		return Object.keys(value)
			.sort()
			.reduce((normalized, key) => {
				const normalizedValue = normalizeValue(value[key]);

				if (normalizedValue !== undefined) {
					normalized[key] = normalizedValue;
				}

				return normalized;
			}, {});
	}

	if (value === undefined) {
		return undefined;
	}

	return value;
}

function buildHashPayload(assetData = {}, metadata = {}) {
	return JSON.stringify({
		asset: normalizeValue(assetData),
		metadata: normalizeValue(metadata),
	});
}

async function generateSha256Hash({ filePath, assetData = {}, metadata = {} }) {
	if (!filePath) {
		const error = new Error('Missing file path');
		error.status = 400;
		throw error;
	}

	let fileBuffer;

	try {
		fileBuffer = await fs.readFile(filePath);
	} catch (error) {
		if (error.code === 'ENOENT') {
			const missingFileError = new Error('Uploaded file not found');
			missingFileError.status = 404;
			throw missingFileError;
		}

		const readError = new Error('Failed to read uploaded file');
		readError.status = 500;
		readError.cause = error;
		throw readError;
	}

	return crypto
		.createHash('sha256')
		.update(fileBuffer)
		.update(buildHashPayload(assetData, metadata))
		.digest('hex');
}

module.exports = {
	generateSha256Hash,
};