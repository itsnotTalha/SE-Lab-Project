const crypto = require('crypto');
const fs = require('fs/promises');

const { STRONG_MATCH_MAX, POSSIBLE_MATCH_MAX } = require('../../config/perceptualMatching');
const assetRepository = require('../../repositories/assetRepository');
const { findBestPhashMatch } = require('../hashing/phashComparisonService');
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

function createHttpError(status, message) {
	const error = new Error(message);
	error.status = status;
	return error;
}

function validateAssetId(assetId) {
	if (!Number.isInteger(assetId) || assetId <= 0) {
		throw createHttpError(400, 'Asset id must be a positive integer');
	}
}

function toPublicAsset(asset) {
	return {
		id: asset.id,
		title: asset.title,
		description: asset.description,
		category: asset.category,
		fileName: asset.fileName,
		fileSize: asset.fileSize,
		mimeType: asset.mimeType,
		status: asset.status,
		createdAt: asset.createdAt,
		updatedAt: asset.updatedAt,
		width: asset.width,
		height: asset.height,
		sha256: asset.sha256Hash,
		phash: asset.phash,
		hasHash: asset.hasHash,
		hasMetadata: asset.hasMetadata,
		contentUrl: `/api/assets/${asset.id}/content`,
	};
}

async function generateFingerprints(file) {
	const metadata = await extractImageMetadata(file.path);
	const sha256 = await generateSha256Hash({ filePath: file.path, metadata });
	const phash = await generatePhash({ filePath: file.path, mimeType: file.mimetype });
	return { metadata, sha256, phash };
}

async function generateExactFingerprint(file) {
	const metadata = await extractImageMetadata(file.path);
	const sha256 = await generateSha256Hash({ filePath: file.path, metadata });
	return { metadata, sha256 };
}

function publicOwnerReference(ownerId) {
	const secret = process.env.PUBLIC_ID_SECRET || process.env.JWT_SECRET || 'vaultchain-development-secret';
	const digest = crypto.createHmac('sha256', secret).update(`owner:${ownerId}`).digest('hex').slice(0, 8).toUpperCase();
	return `VC-${digest}`;
}

function publicAssetReference(assetId) {
	return `VC-A${String(assetId).padStart(6, '0')}`;
}

function formatOwnershipMatch(match, userId, matchType, checked, comparison = {}) {
	const isCurrentUser = match.ownerId === userId;
	return {
		match: true,
		matchType,
		similarity: comparison.similarity ?? null,
		distance: comparison.distance ?? null,
		threshold: comparison.threshold ?? null,
		hashBits: comparison.hashBits ?? null,
		checked,
		asset: {
			id: isCurrentUser ? match.assetId : null,
			reference: publicAssetReference(match.assetId),
			title: isCurrentUser ? match.title : null,
			registeredAt: match.createdAt,
			owner: {
				isCurrentUser,
				label: isCurrentUser ? 'You' : publicOwnerReference(match.ownerId),
			},
		},
	};
}

async function getOwnedAssetOrThrow(userId, assetId) {
	validateAssetId(assetId);
	const asset = await assetRepository.getAssetByIdAndOwnerId(assetId, userId);

	if (!asset) {
		throw createHttpError(404, 'Asset not found');
	}

	return asset;
}

async function getAssets(userId) {
	if (!userId) throw createHttpError(401, 'Unauthorized');
	const assets = await assetRepository.getAssetsByOwnerId(userId);
	return assets.map(toPublicAsset);
}

async function getAsset(userId, assetId) {
	return toPublicAsset(await getOwnedAssetOrThrow(userId, assetId));
}

async function uploadAsset(userId, payload) {
	if (!userId) {
		const error = new Error('Unauthorized');
		error.status = 401;
		throw error;
	}

	validateUploadInput(payload);

	const { title, description, category, file } = payload;

	const { metadata, sha256, phash } = await generateFingerprints(file);
	const existingHash = await assetRepository.findAssetHashByPhash(phash, null);

	if (existingHash) {
		const existingAsset = await assetRepository.getAssetById(existingHash.assetId);
		const isOwnedDuplicate = existingAsset?.ownerId === userId;
		const error = new Error(isOwnedDuplicate
			? `This image was already uploaded before as asset id ${existingHash.assetId}`
			: 'This image was already uploaded to VaultChain');
		error.status = 409;
		error.code = 'DUPLICATE_IMAGE';
		error.duplicateAssetId = isOwnedDuplicate ? existingHash.assetId : null;
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
		asset: toPublicAsset({
			...asset,
			width: metadataRecord?.width ?? metadata.width ?? null,
			height: metadataRecord?.height ?? metadata.height ?? null,
			sha256Hash: hashRecord.sha256Hash,
			phash: phashRecord.phash,
			hasHash: true,
			hasMetadata: Boolean(metadataRecord),
		}),
		hash: {
			sha256: hashRecord.sha256Hash,
			phash: phashRecord.phash,
			alreadyUploadedBefore: false,
			duplicateAssetId: null,
		},
		metadata: metadataRecord,
	};
}

async function checkAssetOwnership(userId, file) {
	if (!userId) throw createHttpError(401, 'Unauthorized');
	if (!file) throw createHttpError(400, 'Image file is required');

	try {
		const { sha256 } = await generateExactFingerprint(file);
		const exactMatch = await assetRepository.findAssetMatchBySha256(sha256);
		if (exactMatch) return formatOwnershipMatch(exactMatch, userId, 'exact', { sha256, phash: null });

		const phash = await generatePhash({ filePath: file.path, mimeType: file.mimetype });
		const checked = { sha256, phash };
		const candidates = await assetRepository.getAssetPhashCandidates();
		const bestMatch = findBestPhashMatch(phash, candidates);
		if (bestMatch && bestMatch.distance <= POSSIBLE_MATCH_MAX) {
			const similarity = bestMatch.distance === 0
				? 'identical'
				: bestMatch.distance <= STRONG_MATCH_MAX ? 'strong' : 'possible';
			const threshold = similarity === 'possible' ? POSSIBLE_MATCH_MAX : STRONG_MATCH_MAX;
			return formatOwnershipMatch(bestMatch, userId, 'perceptual', checked, {
				similarity,
				distance: bestMatch.distance,
				threshold,
				hashBits: bestMatch.hashBits,
			});
		}

		return {
			match: false,
			matchType: null,
			checked,
			asset: null,
		};
	} finally {
		if (file.path) await fs.unlink(file.path).catch(() => {});
	}
}

async function getAssetMetadata(userId, assetId) {
	await getOwnedAssetOrThrow(userId, assetId);

	const metadata = await assetRepository.getAssetMetadataByAssetId(assetId);

	if (!metadata) {
		const error = new Error('Asset metadata not found');
		error.status = 404;
		throw error;
	}

	return metadata;
}

async function getAssetHash(userId, assetId) {
	await getOwnedAssetOrThrow(userId, assetId);

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
	checkAssetOwnership,
	getAssets,
	getAsset,
	getOwnedAssetOrThrow,
	getAssetMetadata,
	getAssetHash,
};
