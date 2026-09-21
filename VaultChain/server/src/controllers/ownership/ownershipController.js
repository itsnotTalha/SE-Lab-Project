const { asyncHandler } = require('../../middleware/asyncHandler');
const ownershipService = require('../../services/ownership/ownershipService');

const getOwnershipHistory = asyncHandler(async (req, res) => {
	const history = await ownershipService.getOwnershipHistory(req.params.assetId);

	res.status(200).json({
		success: true,
		history,
	});
});

module.exports = {
	getOwnershipHistory,
};
