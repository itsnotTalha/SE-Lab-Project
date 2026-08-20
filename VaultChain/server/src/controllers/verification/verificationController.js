const { asyncHandler } = require('../../middleware/asyncHandler');
const verificationService = require('../../services/verification/verificationService');

const createVerification = asyncHandler(async (req, res) => {
	const verification = await verificationService.verifyAsset(req.user.id, {
		assetId: req.body.assetId,
		file: req.file,
	});
	res.status(201).json({ success: true, verification });
});

const getVerifications = asyncHandler(async (req, res) => {
	const verifications = await verificationService.getVerifications(req.user.id);
	res.status(200).json({ success: true, verifications });
});

const getVerification = asyncHandler(async (req, res) => {
	const verification = await verificationService.getVerification(req.user.id, req.params.reference);
	res.status(200).json({ success: true, verification });
});

module.exports = { createVerification, getVerifications, getVerification };
