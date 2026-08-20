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

module.exports = {
	createListing, getListings, getListing, updateListing, deleteListing,
	getListingContent, purchaseListing,
};
