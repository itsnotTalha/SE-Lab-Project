const assetRepository = require('../../repositories/assetRepository');
const { generateSha256Hash } = require('../hashing/sha256Service');

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

	const asset = await assetRepository.createAsset({
		ownerId: userId,
		title: String(title).trim(),
		description: description ? String(description).trim() : null,
		category: String(category).trim(),
		fileName: file.filename,
		filePath: file.path,
		fileSize: file.size,
		mimeType: file.mimetype,
	});

	const sha256 = await generateSha256Hash(file.path);
	const hashRecord = await assetRepository.upsertAssetHash({
		assetId: asset.id,
		sha256Hash: sha256,
	});

	return {
		asset,
		hash: {
			sha256: hashRecord.sha256Hash,
		},
	};
}

module.exports = {
	uploadAsset,
};