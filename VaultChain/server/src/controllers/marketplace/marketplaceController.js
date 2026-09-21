const { asyncHandler } = require('../../middleware/asyncHandler');
const marketplaceService = require('../../services/marketplace/marketplaceService');

const createListing = asyncHandler(async (req, res) => {
	const { assetId, listingType, price, description } = req.body;
	const listing = await marketplaceService.createListing(req.user.id, {
		assetId,
		listingType,
		price,
		description,
	});

	res.status(201).json({
		success: true,
		message: 'Listing created successfully',
		listing,
	});
});

const getListings = asyncHandler(async (req, res) => {
	const { search, minPrice, maxPrice, category, sort, page, limit } = req.query;
	const { listings, pagination } = await marketplaceService.getListings({
		search,
		minPrice,
		maxPrice,
		category,
		sort,
		page,
		limit,
	});

	res.status(200).json({
		success: true,
		listings,
		pagination,
	});
});

const getMyListings = asyncHandler(async (req, res) => {
	const listings = await marketplaceService.getMyListings(req.user.id);

	res.status(200).json({
		success: true,
		listings,
	});
});

const getListableAssets = asyncHandler(async (req, res) => {
	const assets = await marketplaceService.getListableAssets(req.user.id);

	res.status(200).json({
		success: true,
		assets,
	});
});

const getTrades = asyncHandler(async (req, res) => {
	const trades = await marketplaceService.getTrades(req.user.id);

	res.status(200).json({
		success: true,
		trades,
	});
});

const getListingById = asyncHandler(async (req, res) => {
	const listing = await marketplaceService.getListingById(req.params.id);

	res.status(200).json({
		success: true,
		listing,
	});
});

const updateListing = asyncHandler(async (req, res) => {
	const { price, status, description } = req.body;
	const listing = await marketplaceService.updateListing(req.user.id, req.params.id, {
		price,
		status,
		description,
	});

	res.status(200).json({
		success: true,
		message: 'Listing updated successfully',
		listing,
	});
});

const deleteListing = asyncHandler(async (req, res) => {
	const listing = await marketplaceService.deleteListing(req.user.id, req.params.id);

	res.status(200).json({
		success: true,
		message: 'Listing removed successfully',
		listing,
	});
});

const buyListing = asyncHandler(async (req, res) => {
	const purchase = await marketplaceService.purchaseListing(req.user.id, req.params.id);

	res.status(200).json({
		success: true,
		message: `You now own "${purchase.listing.assetTitle}"`,
		purchase,
	});
});

module.exports = {
	createListing,
	getListings,
	getMyListings,
	getListableAssets,
	getTrades,
	getListingById,
	updateListing,
	deleteListing,
	buyListing,
};
