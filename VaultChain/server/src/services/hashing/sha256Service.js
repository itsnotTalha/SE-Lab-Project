const fs = require('fs/promises');
const crypto = require('crypto');

async function generateSha256Hash(filePath) {
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

	return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

module.exports = {
	generateSha256Hash,
};