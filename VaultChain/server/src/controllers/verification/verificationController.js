const { asyncHandler } = require('../../middleware/asyncHandler');
const verificationService = require('../../services/verification/verificationService');

const createVerification = asyncHandler(async (req, res) => {
	const verification = await verificationService.verifyImage(req.user.id, {
		file: req.file,
		tokenFingerprint: req.authTokenFingerprint,
	});
	res.status(201).json({ success: true, verification });
});

const getVerifications = asyncHandler(async (req, res) => {
	const verifications = await verificationService.getVerifications(req.user.id, req.authTokenFingerprint);
	res.status(200).json({ success: true, verifications });
});

const getVerification = asyncHandler(async (req, res) => {
	const verification = await verificationService.getVerification(req.user.id, req.params.reference, req.authTokenFingerprint);
	res.status(200).json({ success: true, verification });
});

module.exports = { createVerification, getVerifications, getVerification };
