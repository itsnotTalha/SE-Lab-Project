const path = require('path');

const { asyncHandler } = require('../../middleware/asyncHandler');
const { uploadDirectory } = require('../../middleware/upload');
const marketplaceService = require('../../services/marketplace/marketplaceService');

const createListing = asyncHandler(async (req, res) => {
	const listing = await marketplaceService.createListing(
		req.user.id,
		req.authTokenFingerprint,
		{ assetId: req.body.assetId, title: req.body.title, description: req.body.description, price: req.body.price }
	);
	res.status(201).json({ success: true, message: 'Listing created successfully', listing });
});

const getListings = asyncHandler(async (req, res) => {
	const listings = await marketplaceService.getListings(req.user.id, req.authTokenFingerprint);
	res.status(200).json({ success: true, listings });
});

const getListing = asyncHandler(async (req, res) => {
	const listing = await marketplaceService.getListing(req.params.reference, req.user.id, req.authTokenFingerprint);
	res.status(200).json({ success: true, listing });
});

const updateListing = asyncHandler(async (req, res) => {
	const listing = await marketplaceService.updateListing(
		req.user.id,
		req.params.reference,
		{ price: req.body.price, title: req.body.title, description: req.body.description },
		req.authTokenFingerprint
	);
	res.status(200).json({ success: true, message: 'Listing updated successfully', listing });
});

const deleteListing = asyncHandler(async (req, res) => {
	const listing = await marketplaceService.deleteListing(
		req.user.id,
		req.params.reference,
		req.authTokenFingerprint
	);
	res.status(200).json({ success: true, message: 'Listing cancelled successfully', listing });
});

const getListingContent = asyncHandler(async (req, res) => {
	const asset = await marketplaceService.getListingContent(
		req.params.reference,
		req.user.id,
		req.authTokenFingerprint
	);
	res.type(asset.mimeType || 'application/octet-stream');
	res.set('Cache-Control', 'private, max-age=300');
	res.sendFile(path.resolve(uploadDirectory, path.basename(asset.fileName)));
});

const purchaseListing = asyncHandler(async (req, res) => {
	const receipt = await marketplaceService.purchaseListing(req.user.id, req.params.reference);
	res.status(200).json({ success: true, message: 'Purchase completed successfully', receipt });
});

const createAccessRequest = asyncHandler(async (req, res) => {
	const reference = req.params.reference || req.body.reference || req.body.listingReference;
	const request = await marketplaceService.createAccessRequest(req.user.id, reference, req.body);
	res.status(201).json({ success: true, message: 'Access request submitted successfully', request });
});

const getReceivedAccessRequests = asyncHandler(async (req, res) => {
	const requests = await marketplaceService.getReceivedAccessRequests(req.user.id);
	res.status(200).json({ success: true, requests });
});

const getSentAccessRequests = asyncHandler(async (req, res) => {
	const requests = await marketplaceService.getSentAccessRequests(req.user.id);
	res.status(200).json({ success: true, requests });
});

const getAccessRequestStatus = asyncHandler(async (req, res) => {
	const status = await marketplaceService.getAccessRequestStatus(req.user.id, req.params.reference);
	res.status(200).json({ success: true, ...status });
});

const approveAccessRequest = asyncHandler(async (req, res) => {
	const result = await marketplaceService.approveAccessRequest(req.user.id, req.params.id, req.body);
	res.status(200).json({ success: true, message: 'Access request approved successfully', ...result });
});

const rejectAccessRequest = asyncHandler(async (req, res) => {
	const request = await marketplaceService.rejectAccessRequest(req.user.id, req.params.id);
	res.status(200).json({ success: true, message: 'Access request rejected successfully', request });
});

const revokeAccessGrant = asyncHandler(async (req, res) => {
	const grant = await marketplaceService.revokeAccessGrant(req.user.id, req.params.id);
	res.status(200).json({ success: true, message: 'Access grant revoked successfully', grant });
});

module.exports = {
	createListing, getListings, getListing, updateListing, deleteListing,
	getListingContent, purchaseListing,
	createAccessRequest, getReceivedAccessRequests, getSentAccessRequests,
	getAccessRequestStatus, approveAccessRequest, rejectAccessRequest,
	revokeAccessGrant,
};
