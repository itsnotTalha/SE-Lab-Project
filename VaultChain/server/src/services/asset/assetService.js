const assetRepository = require('../../repositories/assetRepository');
const { generateSha256Hash } = require('../hashing/sha256Service');
const { extractImageMetadata } = require('../metadata/metadataService');

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

	const metadata = await extractImageMetadata(file.path);
	const metadataRecord = await assetRepository.upsertAssetMetadata({
		assetId: asset.id,
		width: metadata.width,
		height: metadata.height,
		camera: metadata.camera,
		location: metadata.location,
		createdDate: metadata.createdDate,
		metadataJson: metadata.metadataJson,
	});

	const sha256 = await generateSha256Hash({
		filePath: file.path,
		assetData: asset,
		metadata,
	});
	const hashRecord = await assetRepository.upsertAssetHash({
		assetId: asset.id,
		sha256Hash: sha256,
	});

	return {
		asset,
		hash: {
			sha256: hashRecord.sha256Hash,
		},
		metadata: metadataRecord,
	};
}

async function getAssetMetadata(assetId) {
	if (!assetId) {
		const error = new Error('Asset id is required');
		error.status = 400;
		throw error;
	}

	const metadata = await assetRepository.getAssetMetadataByAssetId(assetId);

	if (!metadata) {
		const error = new Error('Asset metadata not found');
		error.status = 404;
		throw error;
	}

	return metadata;
}

module.exports = {
	uploadAsset,
	getAssetMetadata,
};