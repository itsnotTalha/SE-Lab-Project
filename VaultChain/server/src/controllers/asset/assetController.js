const { asyncHandler } = require('../../middleware/asyncHandler');
const assetService = require('../../services/asset/assetService');

function formatMetadataResponse(metadata) {
	return {
		width: metadata.width,
		height: metadata.height,
		camera: metadata.camera,
		location: metadata.location,
		created_date: metadata.createdDate,
		metadata_json: metadata.metadataJson,
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
	});
});

const getAssetMetadata = asyncHandler(async (req, res) => {
	const metadata = await assetService.getAssetMetadata(Number(req.params.id));

	res.status(200).json({
		success: true,
		metadata: formatMetadataResponse(metadata),
	});
});

module.exports = {
	uploadAsset,
	getAssetMetadata,
};