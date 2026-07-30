const { asyncHandler } = require('../../middleware/asyncHandler');
const assetService = require('../../services/asset/assetService');

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
	});
});

module.exports = {
	uploadAsset,
};