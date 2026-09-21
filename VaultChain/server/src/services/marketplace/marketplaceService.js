const { withTransaction } = require('../../database/database');
const assetRepository = require('../../repositories/assetRepository');
const marketplaceRepository = require('../../repositories/marketplaceRepository');
const ownershipRepository = require('../../repositories/ownershipRepository');
const walletRepository = require('../../repositories/walletRepository');
const blockchainRepository = require('../../repositories/blockchainRepository');
const ownershipService = require('../ownership/ownershipService');

// Fixed-price sale is the only listing type that can actually be fulfilled.
// Auctions and rentals are in the roadmap but nothing implements bidding or
// rental terms yet, so they are rejected rather than allowed to create
// listings no buyer could ever complete.
const SUPPORTED_LISTING_TYPES = new Set(['sale']);
const PLANNED_LISTING_TYPES = new Set(['auction', 'rent']);

// A seller may move a listing back off the market, but only the purchase flow
// is allowed to mark something sold.
const SELLER_UPDATABLE_STATUSES = new Set(['removed']);

// A verification result that means the asset is not safe to sell.
const BLOCKING_VERIFICATION_STATUSES = new Set(['duplicate', 'modified', 'modified_copy', 'modified copy']);

const MAX_PRICE = 1_000_000_000;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;
const SORT_OPTIONS = new Set(['newest', 'oldest', 'price_asc', 'price_desc']);

// Percentage of the sale price kept by the platform. Left at 0 until there is
// a platform wallet to credit it to, so today a seller receives the full price.
const FEE_PERCENT = Number(process.env.MARKETPLACE_FEE_PERCENT || 0);

// When the Verification module is finished this can be switched on to require
// a passing report before an asset may be listed (BR-05). Until then an asset
// with no report at all is still listable, but one already flagged as a
// duplicate or a modified copy is always blocked.
const REQUIRE_VERIFIED_LISTINGS = String(process.env.REQUIRE_VERIFIED_LISTINGS || 'false') === 'true';

function badRequest(message, status = 400) {
	const error = new Error(message);
	error.status = status;

	return error;
}

function roundMoney(value) {
	return Math.round(value * 100) / 100;
}

function parsePositiveInteger(value, fieldName) {
	const numericValue = Number(value);

	if (!Number.isInteger(numericValue) || numericValue <= 0) {
		throw badRequest(`${fieldName} must be a positive whole number`);
	}

	return numericValue;
}

function parsePrice(value) {
	const numericPrice = Number(value);

	if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
		throw badRequest('price must be a positive number');
	}

	if (numericPrice > MAX_PRICE) {
		throw badRequest(`price must not be greater than ${MAX_PRICE}`);
	}

	return roundMoney(numericPrice);
}

function validateListingType(listingType) {
	if (SUPPORTED_LISTING_TYPES.has(listingType)) {
		return listingType;
	}

	if (PLANNED_LISTING_TYPES.has(listingType)) {
		throw badRequest(`${listingType} listings are not available yet — use a fixed-price sale listing`);
	}

	throw badRequest('listingType must be sale');
}

async function assertOwnsAsset(assetId, userId) {
	const asset = await assetRepository.getAssetById(assetId);

	if (!asset) {
		throw badRequest('Asset not found', 404);
	}

	if (asset.ownerId !== userId) {
		throw badRequest('You do not own this asset', 403);
	}

	return asset;
}

async function getListingOwnedByUserOrThrow(listingId, userId) {
	const listing = await marketplaceRepository.getListingById(listingId);

	if (!listing) {
		throw badRequest('Listing not found', 404);
	}

	if (listing.sellerId !== userId) {
		throw badRequest('You do not own this listing', 403);
	}

	return listing;
}

/**
 * Decides whether an asset's verification record allows it to be listed.
 * Returns the latest report so callers can show it to the buyer.
 */
async function assertAssetIsListable(assetId) {
	const report = await marketplaceRepository.getLatestVerificationReportByAssetId(assetId);
	const status = report && report.status ? String(report.status).toLowerCase() : null;

	if (status && BLOCKING_VERIFICATION_STATUSES.has(status)) {
		throw badRequest(
			`This asset cannot be listed because its latest verification result is "${report.status}"`,
			422
		);
	}

	if (REQUIRE_VERIFIED_LISTINGS && status !== 'original') {
		throw badRequest('This asset must pass verification before it can be listed', 422);
	}

	return report;
}

async function createListing(userId, { assetId, listingType, price, description }) {
	const numericAssetId = parsePositiveInteger(assetId, 'assetId');
	const validatedType = validateListingType(listingType);
	const numericPrice = parsePrice(price);

	await assertOwnsAsset(numericAssetId, userId);
	await assertAssetIsListable(numericAssetId);

	const existingListing = await marketplaceRepository.getActiveListingByAssetId(numericAssetId);

	if (existingListing) {
		throw badRequest('This asset already has an active listing', 409);
	}

	try {
		return await marketplaceRepository.createListing({
			assetId: numericAssetId,
			sellerId: userId,
			listingType: validatedType,
			price: numericPrice,
			description: description ? String(description).trim() : null,
		});
	} catch (error) {
		// The unique index is the real guard against two simultaneous requests
		// both passing the check above.
		if (String(error.message).includes('UNIQUE constraint failed')) {
			throw badRequest('This asset already has an active listing', 409);
		}

		throw error;
	}
}

function parseListingQuery({ search, minPrice, maxPrice, category, sort, page, limit } = {}) {
	const parsedLimit = limit == null ? DEFAULT_PAGE_SIZE : Number(limit);
	const parsedPage = page == null ? 1 : Number(page);

	if (!Number.isInteger(parsedLimit) || parsedLimit <= 0 || parsedLimit > MAX_PAGE_SIZE) {
		throw badRequest(`limit must be a whole number between 1 and ${MAX_PAGE_SIZE}`);
	}

	if (!Number.isInteger(parsedPage) || parsedPage <= 0) {
		throw badRequest('page must be a positive whole number');
	}

	const parsedMinPrice = minPrice == null || minPrice === '' ? null : Number(minPrice);
	const parsedMaxPrice = maxPrice == null || maxPrice === '' ? null : Number(maxPrice);

	if (parsedMinPrice != null && (!Number.isFinite(parsedMinPrice) || parsedMinPrice < 0)) {
		throw badRequest('minPrice must be a number of 0 or more');
	}

	if (parsedMaxPrice != null && (!Number.isFinite(parsedMaxPrice) || parsedMaxPrice < 0)) {
		throw badRequest('maxPrice must be a number of 0 or more');
	}

	if (parsedMinPrice != null && parsedMaxPrice != null && parsedMinPrice > parsedMaxPrice) {
		throw badRequest('minPrice must not be greater than maxPrice');
	}

	if (sort && !SORT_OPTIONS.has(sort)) {
		throw badRequest(`sort must be one of ${[...SORT_OPTIONS].join(', ')}`);
	}

	return {
		search: search ? String(search).trim() : null,
		minPrice: parsedMinPrice,
		maxPrice: parsedMaxPrice,
		category: category ? String(category).trim() : null,
		sort: sort || 'newest',
		limit: parsedLimit,
		offset: (parsedPage - 1) * parsedLimit,
		page: parsedPage,
	};
}

async function getListings(query) {
	const parsedQuery = parseListingQuery(query);
	const { listings, total } = await marketplaceRepository.getActiveListings(parsedQuery);

	return {
		listings,
		pagination: {
			page: parsedQuery.page,
			limit: parsedQuery.limit,
			total,
			totalPages: Math.max(1, Math.ceil(total / parsedQuery.limit)),
		},
	};
}

async function getMyListings(userId) {
	return marketplaceRepository.getListingsBySellerId(userId);
}

/**
 * Listing details plus the evidence a buyer needs in order to trust it: what
 * verification said about the asset, its hashes and metadata, who has owned it
 * and the ledger blocks recording those transfers.
 */
async function getListingById(id) {
	const numericId = parsePositiveInteger(id, 'listing id');
	const listing = await marketplaceRepository.getListingById(numericId);

	if (!listing) {
		throw badRequest('Listing not found', 404);
	}

	const [verification, hashes, metadata, ownershipHistory, blocks] = await Promise.all([
		marketplaceRepository.getLatestVerificationReportByAssetId(listing.assetId),
		assetRepository.getAssetHashByAssetId(listing.assetId),
		assetRepository.getAssetMetadataByAssetId(listing.assetId),
		ownershipRepository.getHistoryByAssetId(listing.assetId),
		blockchainRepository.getBlocksByAssetId(listing.assetId),
	]);

	return {
		...listing,
		verification,
		hashes: hashes
			? {
					sha256Hash: hashes.sha256Hash,
					phash: hashes.phash,
				}
			: null,
		metadata: metadata
			? {
					width: metadata.width,
					height: metadata.height,
					camera: metadata.camera,
					location: metadata.location,
					createdDate: metadata.createdDate,
				}
			: null,
		ownershipHistory,
		blockchain: blocks,
	};
}

async function updateListing(userId, id, { price, status, description }) {
	const numericId = parsePositiveInteger(id, 'listing id');
	const listing = await getListingOwnedByUserOrThrow(numericId, userId);

	if (listing.status !== 'active') {
		throw badRequest(`A listing that is already ${listing.status} can no longer be changed`, 409);
	}

	if (status != null && !SELLER_UPDATABLE_STATUSES.has(status)) {
		throw badRequest(
			status === 'sold'
				? 'A listing is only marked sold by completing a purchase'
				: `status must be ${[...SELLER_UPDATABLE_STATUSES].join(', ')}`,
			status === 'sold' ? 409 : 400
		);
	}

	return marketplaceRepository.updateListing(numericId, {
		price: price != null ? parsePrice(price) : null,
		status: status != null ? status : null,
		description: description != null ? String(description).trim() : null,
	});
}

async function deleteListing(userId, id) {
	const numericId = parsePositiveInteger(id, 'listing id');
	const listing = await getListingOwnedByUserOrThrow(numericId, userId);

	if (listing.status === 'sold') {
		throw badRequest('A sold listing cannot be removed', 409);
	}

	return marketplaceRepository.softDeleteListing(numericId);
}

/**
 * Buys a listed asset.
 *
 * Everything the purchase touches — both wallet balances, both wallet ledger
 * rows, the asset's owner, the ownership history entry, the blockchain block
 * and the listing status — is written inside one transaction. If any step
 * fails, the whole purchase is rolled back, so there is no state in which the
 * money moved but the asset did not, or the reverse.
 */
async function purchaseListing(buyerId, id) {
	const numericId = parsePositiveInteger(id, 'listing id');

	return withTransaction(async (client) => {
		const listing = await marketplaceRepository.getListingById(numericId, client);

		if (!listing) {
			throw badRequest('Listing not found', 404);
		}

		if (listing.sellerId === buyerId) {
			throw badRequest('You cannot buy your own listing', 400);
		}

		if (listing.status !== 'active') {
			throw badRequest(`This listing is no longer available (${listing.status})`, 409);
		}

		if (listing.listingType !== 'sale') {
			throw badRequest('Only fixed-price sale listings can be bought', 409);
		}

		if (listing.assetOwnerId !== listing.sellerId) {
			throw badRequest('The seller no longer owns this asset', 409);
		}

		const buyerWallet = await walletRepository.getWalletByUserId(buyerId, client);
		const sellerWallet = await walletRepository.getWalletByUserId(listing.sellerId, client);

		if (!buyerWallet || !sellerWallet) {
			throw badRequest('Wallet not found', 404);
		}

		const price = roundMoney(listing.price);

		if (buyerWallet.balance < price) {
			throw badRequest(
				`Insufficient wallet balance — this listing costs ${price} Credits and your balance is ${buyerWallet.balance}`,
				402
			);
		}

		// Claiming the listing first means a second buyer arriving for the same
		// listing changes no rows and is turned away before any money moves.
		const claimedRows = await marketplaceRepository.claimListingForBuyer(
			{ listingId: numericId, buyerId },
			client
		);

		if (claimedRows === 0) {
			throw badRequest('This listing was just bought by someone else', 409);
		}

		const fee = roundMoney((price * FEE_PERCENT) / 100);
		const sellerProceeds = roundMoney(price - fee);
		const reference = `listing:${numericId}`;

		const buyerResult = await walletRepository.applyBalanceChange(
			{
				walletId: buyerWallet.id,
				type: 'purchase',
				amount: price,
				signedAmount: -price,
				description: `Purchased "${listing.assetTitle}" from ${listing.sellerName}`,
				referenceId: reference,
			},
			client
		);

		await walletRepository.applyBalanceChange(
			{
				walletId: sellerWallet.id,
				type: 'sale',
				amount: sellerProceeds,
				signedAmount: sellerProceeds,
				description: fee
					? `Sold "${listing.assetTitle}" (${price} Credits less ${fee} Credits platform fee)`
					: `Sold "${listing.assetTitle}"`,
				referenceId: reference,
			},
			client
		);

		const { historyEntry, block } = await ownershipService.transferOwnership(
			{
				assetId: listing.assetId,
				fromUserId: listing.sellerId,
				toUserId: buyerId,
				transferType: 'sale',
			},
			client
		);

		const soldListing = await marketplaceRepository.getListingById(numericId, client);

		return {
			listing: soldListing,
			price,
			fee,
			sellerProceeds,
			wallet: buyerResult.wallet,
			transaction: buyerResult.transaction,
			ownership: historyEntry,
			block,
		};
	});
}

async function getTrades(userId) {
	return marketplaceRepository.getTradesByUserId(userId);
}

/**
 * The caller's own assets, each annotated with whether it can be listed right
 * now and why not, so the create-listing form can explain itself instead of
 * only failing on submit.
 */
async function getListableAssets(userId) {
	const assets = await marketplaceRepository.getOwnedAssetsWithListingState(userId);

	return assets.map((asset) => {
		const status = asset.verificationStatus ? String(asset.verificationStatus).toLowerCase() : null;

		let listable = true;
		let reason = null;

		if (asset.activeListingId) {
			listable = false;
			reason = 'Already listed on the marketplace';
		} else if (status && BLOCKING_VERIFICATION_STATUSES.has(status)) {
			listable = false;
			reason = `Verification result is "${asset.verificationStatus}"`;
		} else if (REQUIRE_VERIFIED_LISTINGS && status !== 'original') {
			listable = false;
			reason = 'Not verified yet';
		}

		return { ...asset, listable, reason };
	});
}

module.exports = {
	createListing,
	getListings,
	getMyListings,
	getListingById,
	updateListing,
	deleteListing,
	purchaseListing,
	getTrades,
	getListableAssets,
};
