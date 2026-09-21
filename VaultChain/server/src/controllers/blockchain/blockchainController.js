const { asyncHandler } = require('../../middleware/asyncHandler');
const blockchainService = require('../../services/blockchain/blockchainService');

const getBlocks = asyncHandler(async (req, res) => {
	const blocks = await blockchainService.getChain();

	res.status(200).json({
		success: true,
		blocks,
	});
});

const getAssetBlocks = asyncHandler(async (req, res) => {
	const blocks = await blockchainService.getAssetChain(req.params.assetId);

	res.status(200).json({
		success: true,
		blocks,
	});
});

const verifyChain = asyncHandler(async (req, res) => {
	const result = await blockchainService.verifyChain();

	res.status(200).json({
		success: true,
		...result,
	});
});

module.exports = {
	getBlocks,
	getAssetBlocks,
	verifyChain,
};
