const { asyncHandler } = require('../../middleware/asyncHandler');
const marketplaceService = require('../../services/marketplace/marketplaceService');

const createListing = asyncHandler(async (req, res) => {
	const {
		assetId,
		listingType,
		price,
		description,
		startingPrice,
		reservePrice,
		minBidIncrement,
		endsAt,
		shareCount,
	} = req.body;
	const listing = await marketplaceService.createListing(req.user.id, {
		assetId,
		listingType,
		price,
		description,
		startingPrice,
		reservePrice,
		minBidIncrement,
		endsAt,
		shareCount,
	});

	res.status(201).json({
		success: true,
		message: 'Listing created successfully',
		listing,
	});
});

const getListings = asyncHandler(async (req, res) => {
	const { search, minPrice, maxPrice, category, listingType, sort, page, limit } = req.query;
	const { listings, pagination } = await marketplaceService.getListings({
		search,
		minPrice,
		maxPrice,
		category,
		listingType,
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
		message: purchase.shareCount
			? `You now hold ${purchase.shareCount} shares of "${purchase.listing.assetTitle}"`
			: `You now own "${purchase.listing.assetTitle}"`,
		purchase,
	});
});

const placeBid = asyncHandler(async (req, res) => {
	const result = await marketplaceService.placeBid(req.user.id, Number(req.params.id), req.body.amount);

	res.status(201).json({
		success: true,
		message: `Bid of ${result.bid.amount} Credits placed`,
		...result,
	});
});

const getBids = asyncHandler(async (req, res) => {
	const bids = await marketplaceService.getBids(Number(req.params.id));

	res.status(200).json({
		success: true,
		bids,
	});
});

const cancelAuction = asyncHandler(async (req, res) => {
	const listing = await marketplaceService.cancelAuction(req.user.id, Number(req.params.id));

	res.status(200).json({
		success: true,
		message: 'Auction cancelled',
		listing,
	});
});

const fractionalizeAsset = asyncHandler(async (req, res) => {
	const result = await marketplaceService.fractionalizeAsset(
		req.user.id,
		req.params.assetId,
		req.body.totalShares
	);

	res.status(201).json({
		success: true,
		message: `Asset split into ${result.fractional.totalShares} shares`,
		...result,
	});
});

const getShares = asyncHandler(async (req, res) => {
	const shares = await marketplaceService.getShares(req.params.assetId);

	res.status(200).json({
		success: true,
		...shares,
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
	placeBid,
	getBids,
	cancelAuction,
	fractionalizeAsset,
	getShares,
};
