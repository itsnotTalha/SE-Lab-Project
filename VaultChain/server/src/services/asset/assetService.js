const assetRepository = require('../../repositories/assetRepository');
const { generateSha256Hash } = require('../hashing/sha256Service');
const { generatePhash } = require('../hashing/phashService');
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

	const metadata = await extractImageMetadata(file.path);
	const sha256 = await generateSha256Hash({
		filePath: file.path,
		metadata,
	});
	const phash = await generatePhash({
		filePath: file.path,
		mimeType: file.mimetype,
	});
	const existingHash = await assetRepository.findAssetHashByPhash(phash, null);

	if (existingHash) {
		const error = new Error(`This image was already uploaded before as asset id ${existingHash.assetId}`);
		error.status = 409;
		error.code = 'DUPLICATE_IMAGE';
		error.duplicateAssetId = existingHash.assetId;
		throw error;
	}

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
	const metadataRecord = await assetRepository.upsertAssetMetadata({
		assetId: asset.id,
		width: metadata.width,
		height: metadata.height,
		pixelCount: metadata.pixelCount,
		patterns: metadata.patterns,
		camera: metadata.camera,
		location: metadata.location,
		createdDate: metadata.createdDate,
		metadataJson: metadata.metadataJson,
	});

	const hashRecord = await assetRepository.upsertAssetHash({
		assetId: asset.id,
		sha256Hash: sha256,
	});
	const phashRecord = await assetRepository.updateAssetPhash({
		assetId: asset.id,
		phash,
	});

	return {
		asset: {
			...asset,
			pixelCount: metadataRecord?.pixelCount ?? metadata.pixelCount ?? null,
		},
		hash: {
			sha256: hashRecord.sha256Hash,
			phash: phashRecord.phash,
			alreadyUploadedBefore: false,
			duplicateAssetId: null,
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

async function getAssetHash(assetId) {
	if (!assetId) {
		const error = new Error('Asset id is required');
		error.status = 400;
		throw error;
	}

	const hash = await assetRepository.getAssetHashByAssetId(assetId);

	if (!hash) {
		const error = new Error('Asset hash not found');
		error.status = 404;
		throw error;
	}

	return {
		...hash,
		alreadyUploadedBefore: false,
		duplicateAssetId: null,
	};
}

module.exports = {
	uploadAsset,
	getAssetMetadata,
	getAssetHash,
};