const { asyncHandler } = require('../../middleware/asyncHandler');
const marketplaceService = require('../../services/marketplace/marketplaceService');

const createListing = asyncHandler(async (req, res) => {
	const { assetId, listingType, price } = req.body;
	const listing = await marketplaceService.createListing(req.user.id, { assetId, listingType, price });

	res.status(201).json({
		success: true,
		message: 'Listing created successfully',
		listing,
	});
});

const getListings = asyncHandler(async (req, res) => {
	const listings = await marketplaceService.getListings();

	res.status(200).json({
		success: true,
		listings,
	});
});

const getListingById = asyncHandler(async (req, res) => {
	const listing = await marketplaceService.getListingById(Number(req.params.id));

	res.status(200).json({
		success: true,
		listing,
	});
});

const updateListing = asyncHandler(async (req, res) => {
	const { price, status } = req.body;
	const listing = await marketplaceService.updateListing(req.user.id, Number(req.params.id), { price, status });

	res.status(200).json({
		success: true,
		message: 'Listing updated successfully',
		listing,
	});
});

const deleteListing = asyncHandler(async (req, res) => {
	const listing = await marketplaceService.deleteListing(req.user.id, Number(req.params.id));

	res.status(200).json({
		success: true,
		message: 'Listing removed successfully',
		listing,
	});
});

module.exports = {
	createListing,
	getListings,
	getListingById,
	updateListing,
	deleteListing,
};
