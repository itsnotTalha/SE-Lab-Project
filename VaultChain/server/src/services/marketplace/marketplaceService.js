const assetRepository = require('../../repositories/assetRepository');
const marketplaceRepository = require('../../repositories/marketplaceRepository');

const LISTING_TYPES = new Set(['sale', 'auction', 'rent']);
const UPDATABLE_STATUSES = new Set(['active', 'sold', 'removed']);

async function assertOwnsAsset(assetId, userId) {
	const asset = await assetRepository.getAssetById(assetId);

	if (!asset) {
		const error = new Error('Asset not found');
		error.status = 404;
		throw error;
	}

	if (asset.ownerId !== userId) {
		const error = new Error('You do not own this asset');
		error.status = 403;
		throw error;
	}

	return asset;
}

async function getListingOwnedByUserOrThrow(listingId, userId) {
	const listing = await marketplaceRepository.getListingById(listingId);

	if (!listing) {
		const error = new Error('Listing not found');
		error.status = 404;
		throw error;
	}

	if (listing.sellerId !== userId) {
		const error = new Error('You do not own this listing');
		error.status = 403;
		throw error;
	}

	return listing;
}

async function createListing(userId, { assetId, listingType, price }) {
	const numericAssetId = Number(assetId);
	const numericPrice = Number(price);

	if (!Number.isInteger(numericAssetId) || numericAssetId <= 0) {
		const error = new Error('assetId is required');
		error.status = 400;
		throw error;
	}

	if (!LISTING_TYPES.has(listingType)) {
		const error = new Error('listingType must be one of sale, auction, rent');
		error.status = 400;
		throw error;
	}

	if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
		const error = new Error('price must be a positive number');
		error.status = 400;
		throw error;
	}

	await assertOwnsAsset(numericAssetId, userId);

	return marketplaceRepository.createListing({
		assetId: numericAssetId,
		sellerId: userId,
		listingType,
		price: numericPrice,
	});
}

async function getListings() {
	return marketplaceRepository.getActiveListings();
}

async function getListingById(id) {
	const listing = await marketplaceRepository.getListingById(id);

	if (!listing) {
		const error = new Error('Listing not found');
		error.status = 404;
		throw error;
	}

	return listing;
}

async function updateListing(userId, id, { price, status }) {
	await getListingOwnedByUserOrThrow(id, userId);

	if (price != null && (!Number.isFinite(Number(price)) || Number(price) <= 0)) {
		const error = new Error('price must be a positive number');
		error.status = 400;
		throw error;
	}

	if (status != null && !UPDATABLE_STATUSES.has(status)) {
		const error = new Error('status must be one of active, sold, removed');
		error.status = 400;
		throw error;
	}

	return marketplaceRepository.updateListing(id, {
		price: price != null ? Number(price) : null,
		status: status != null ? status : null,
	});
}

async function deleteListing(userId, id) {
	await getListingOwnedByUserOrThrow(id, userId);

	return marketplaceRepository.softDeleteListing(id);
}

module.exports = {
	createListing,
	getListings,
	getListingById,
	updateListing,
	deleteListing,
};
