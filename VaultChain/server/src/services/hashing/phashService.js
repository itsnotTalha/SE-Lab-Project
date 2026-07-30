const fs = require('fs/promises');
const { imageHash } = require('image-hash');

const supportedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

function hashImageBuffer(buffer, mimeType) {
	return new Promise((resolve, reject) => {
		imageHash(
			{
				data: buffer,
				ext: mimeType,
			},
			16,
			true,
			(error, hash) => {
				if (error) {
					reject(error);
					return;
				}

				resolve(hash);
			}
		);
	});
}

async function generatePhash({ filePath, mimeType }) {
	if (!filePath) {
		const error = new Error('Missing file path');
		error.status = 400;
		throw error;
	}

	if (!supportedMimeTypes.has(mimeType)) {
		const error = new Error('Unsupported image format');
		error.status = 415;
		throw error;
	}

	try {
		await fs.access(filePath);
	} catch (error) {
		const missingFileError = new Error('Uploaded file not found');
		missingFileError.status = 404;
		throw missingFileError;
	}

	let fileBuffer;

	try {
		fileBuffer = await fs.readFile(filePath);
	} catch (error) {
		const readError = new Error('Failed to read uploaded file');
		readError.status = 500;
		readError.cause = error;
		throw readError;
	}

	try {
		const phash = await hashImageBuffer(fileBuffer, mimeType);
		return String(phash).toLowerCase();
	} catch (error) {
		const hashError = new Error('Failed to generate perceptual hash');
		hashError.status = error.status || 500;
		hashError.cause = error;
		throw hashError;
	}
}

module.exports = {
	generatePhash,
};