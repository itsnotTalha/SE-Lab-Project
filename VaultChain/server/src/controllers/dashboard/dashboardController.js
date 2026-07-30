const { asyncHandler } = require('../../middleware/asyncHandler');
const dashboardService = require('../../services/dashboard/dashboardService');

const getSummary = asyncHandler(async (req, res) => {
	const summary = await dashboardService.getSummary(req.user.id);

	res.status(200).json({
		success: true,
		summary,
	});
});

module.exports = {
	getSummary,
};
