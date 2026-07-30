const assetRepository = require('../../repositories/assetRepository');

function validateUploadInput({ title, category, file }) {
	if (!title || !String(title).trim()) {
		const error = new Error('Title is required');
		error.status = 400;
		throw error;
	}

	if (!category || !String(category).trim()) {
		const error = new Error('Category is required');
		error.status = 400;
		throw error;
	}

	if (!file) {
		const error = new Error('File is required');
		error.status = 400;
		throw error;
	}
}

async function uploadAsset(userId, payload) {
	if (!userId) {
		const error = new Error('Unauthorized');
		error.status = 401;
		throw error;
	}

	validateUploadInput(payload);

	const { title, description, category, file } = payload;

	return assetRepository.createAsset({
		ownerId: userId,
		title: String(title).trim(),
		description: description ? String(description).trim() : null,
		category: String(category).trim(),
		fileName: file.filename,
		filePath: file.path,
		fileSize: file.size,
		mimeType: file.mimetype,
	});
}

module.exports = {
	uploadAsset,
};