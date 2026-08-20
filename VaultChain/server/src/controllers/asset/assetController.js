const { asyncHandler } = require('../../middleware/asyncHandler');
const assetService = require('../../services/asset/assetService');
const { uploadDirectory } = require('../../middleware/upload');
const path = require('path');

function formatMetadataResponse(metadata) {
	return {
		width: metadata.width,
		height: metadata.height,
		pixelCount: metadata.pixelCount,
		pixel_count: metadata.pixelCount,
		patterns: metadata.patterns,
		camera: metadata.camera,
		location: metadata.location,
		created_date: metadata.createdDate,
		metadata_json: metadata.metadataJson,
	};
}

function formatHashResponse(hash) {
	return {
		sha256: hash.sha256Hash,
		phash: hash.phash,
		alreadyUploadedBefore: hash.alreadyUploadedBefore,
		duplicateAssetId: hash.duplicateAssetId,
	};
}

const uploadAsset = asyncHandler(async (req, res) => {
	const result = await assetService.uploadAsset(req.user.id, {
		title: req.body.title,
		description: req.body.description,
		category: req.body.category,
		file: req.file,
	});

	res.status(201).json({
		success: true,
		message: 'Asset uploaded successfully',
		asset: result.asset,
		hash: result.hash,
		metadata: result.metadata,
		pixelCount: result.asset?.pixelCount ?? result.metadata?.pixelCount ?? null,
	});
});

const checkAssetOwnership = asyncHandler(async (req, res) => {
	const result = await assetService.checkAssetOwnership(req.user.id, req.file);

	res.status(200).json({
		success: true,
		result,
	});
});

const getAssets = asyncHandler(async (req, res) => {
	const assets = await assetService.getAssets(req.user.id);

	res.status(200).json({
		success: true,
		assets,
	});
});

const getAsset = asyncHandler(async (req, res) => {
	const asset = await assetService.getAsset(req.user.id, Number(req.params.id));

	res.status(200).json({
		success: true,
		asset,
	});
});

const getAssetContent = asyncHandler(async (req, res) => {
	const asset = await assetService.getOwnedAssetOrThrow(req.user.id, Number(req.params.id));
	const contentPath = path.resolve(uploadDirectory, path.basename(asset.fileName));

	res.type(asset.mimeType || 'application/octet-stream');
	res.set('Cache-Control', 'private, max-age=300');
	res.sendFile(contentPath);
});

const getAssetMetadata = asyncHandler(async (req, res) => {
	const metadata = await assetService.getAssetMetadata(req.user.id, Number(req.params.id));

	res.status(200).json({
		success: true,
		metadata: formatMetadataResponse(metadata),
	});
});

const getAssetHash = asyncHandler(async (req, res) => {
	const hash = await assetService.getAssetHash(req.user.id, Number(req.params.id));

	res.status(200).json({
		success: true,
		hashes: formatHashResponse(hash),
	});
});

module.exports = {
	uploadAsset,
	checkAssetOwnership,
	getAssets,
	getAsset,
	getAssetContent,
	getAssetMetadata,
	getAssetHash,
};
