const { withTransaction } = require('../../database/database');
const assetRepository = require('../../repositories/assetRepository');
const fractionalRepository = require('../../repositories/fractionalRepository');
const marketplaceRepository = require('../../repositories/marketplaceRepository');
const ownershipRepository = require('../../repositories/ownershipRepository');
const walletRepository = require('../../repositories/walletRepository');
const blockchainService = require('../blockchain/blockchainService');

const FEE_PERCENT = Number(process.env.MARKETPLACE_FEE_PERCENT || 0);

const MIN_TOTAL_SHARES = 2;
const MAX_TOTAL_SHARES = 10000;

function badRequest(message, status = 400) {
	const error = new Error(message);
	error.status = status;

	return error;
}

function roundMoney(value) {
	return Math.round(value * 100) / 100;
}

/**
 * Splits an asset into shares so it can be co-owned.
 *
 * The asset keeps its owner_id, which now means "custodian of record"; the
 * authoritative ownership becomes the share register. The whole asset can
 * still be sold outright, but only by someone who holds every share.
 */
async function fractionalizeAsset(userId, assetId, totalShares) {
	const numericAssetId = Number(assetId);
	const numericShares = Number(totalShares);

	if (!Number.isInteger(numericAssetId) || numericAssetId <= 0) {
		throw badRequest('A valid assetId is required');
	}

	if (!Number.isInteger(numericShares) || numericShares < MIN_TOTAL_SHARES || numericShares > MAX_TOTAL_SHARES) {
		throw badRequest(`totalShares must be a whole number between ${MIN_TOTAL_SHARES} and ${MAX_TOTAL_SHARES}`);
	}

	return withTransaction(async (client) => {
		const asset = await assetRepository.getAssetById(numericAssetId);

		if (!asset) {
			throw badRequest('Asset not found', 404);
		}

		if (asset.ownerId !== userId) {
			throw badRequest('You do not own this asset', 403);
		}

		const existing = await fractionalRepository.getFractionalAsset(numericAssetId, client);

		if (existing) {
			throw badRequest('This asset has already been split into shares', 409);
		}

		const activeListing = await marketplaceRepository.getActiveListingByAssetId(numericAssetId, client);

		if (activeListing) {
			throw badRequest('Remove the active listing before splitting this asset into shares', 409);
		}

		await fractionalRepository.createFractionalAsset(
			{ assetId: numericAssetId, totalShares: numericShares },
			client
		);

		await fractionalRepository.setHolding(
			{ assetId: numericAssetId, userId, shares: numericShares, totalShares: numericShares },
			client
		);

		const block = await blockchainService.mineBlock(
			{ assetId: numericAssetId, ownerId: userId, action: 'asset_fractionalized' },
			client
		);

		await ownershipRepository.createHistoryEntry(
			{
				assetId: numericAssetId,
				previousOwner: userId,
				newOwner: userId,
				transferType: 'fractionalize',
				blockchainBlockId: block.id,
			},
			client
		);

		return {
			fractional: await fractionalRepository.getFractionalAsset(numericAssetId, client),
			holdings: await fractionalRepository.getHoldings(numericAssetId, client),
			block,
		};
	});
}

async function getShares(assetId) {
	const numericAssetId = Number(assetId);

	if (!Number.isInteger(numericAssetId) || numericAssetId <= 0) {
		throw badRequest('A valid assetId is required');
	}

	const asset = await assetRepository.getAssetById(numericAssetId);

	if (!asset) {
		throw badRequest('Asset not found', 404);
	}

	const fractional = await fractionalRepository.getFractionalAsset(numericAssetId);

	if (!fractional) {
		return { assetId: numericAssetId, fractional: null, holdings: [] };
	}

	return {
		assetId: numericAssetId,
		fractional,
		holdings: await fractionalRepository.getHoldings(numericAssetId),
	};
}

/**
 * Validates the fractional half of a create-listing request: the asset must
 * have been split, and the seller must actually hold the shares they are
 * offering.
 */
async function buildFractionalFields(userId, assetId, { shareCount, price }) {
	const numericShares = Number(shareCount);
	const numericPrice = Number(price);

	if (!Number.isInteger(numericShares) || numericShares <= 0) {
		throw badRequest('shareCount must be a positive whole number');
	}

	if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
		throw badRequest('price must be a positive number');
	}

	const fractional = await fractionalRepository.getFractionalAsset(assetId);

	if (!fractional) {
		throw badRequest('This asset has not been split into shares yet', 409);
	}

	const holding = await fractionalRepository.getHolding(assetId, userId);

	if (!holding || holding.shares < numericShares) {
		throw badRequest(
			`You only hold ${holding ? holding.shares : 0} of the ${fractional.totalShares} shares in this asset`,
			409
		);
	}

	const existingOffer = await marketplaceRepository.getActiveFractionalListing(assetId, userId);

	if (existingOffer) {
		throw badRequest('You already have an active share offer for this asset', 409);
	}

	return {
		// For a fractional listing `price` is the price of a single share.
		price: roundMoney(numericPrice),
		shareCount: numericShares,
	};
}

/**
 * Buys the whole block of shares offered by a fractional listing.
 *
 * Shares and money move in one transaction, and the transfer is recorded in
 * the ownership history and the ledger just like a whole-asset sale. Partial
 * fills are not supported: a buyer takes the entire offer or none of it.
 */
async function purchaseShares(buyerId, listingId, client) {
	const listing = await marketplaceRepository.getListingById(listingId, client);

	if (!listing) {
		throw badRequest('Listing not found', 404);
	}

	if (listing.sellerId === buyerId) {
		throw badRequest('You cannot buy your own listing', 400);
	}

	if (listing.status !== 'active') {
		throw badRequest(`This listing is no longer available (${listing.status})`, 409);
	}

	const fractional = await fractionalRepository.getFractionalAsset(listing.assetId, client);

	if (!fractional) {
		throw badRequest('This asset is no longer split into shares', 409);
	}

	const sellerHolding = await fractionalRepository.getHolding(listing.assetId, listing.sellerId, client);

	if (!sellerHolding || sellerHolding.shares < listing.shareCount) {
		throw badRequest('The seller no longer holds enough shares', 409);
	}

	const total = roundMoney(listing.price * listing.shareCount);
	const buyerWallet = await walletRepository.getWalletByUserId(buyerId, client);
	const sellerWallet = await walletRepository.getWalletByUserId(listing.sellerId, client);

	if (!buyerWallet || !sellerWallet) {
		throw badRequest('Wallet not found', 404);
	}

	if (buyerWallet.balance < total) {
		throw badRequest(
			`Insufficient wallet balance — ${listing.shareCount} shares cost ${total} Credits and your balance is ${buyerWallet.balance}`,
			402
		);
	}

	const claimedRows = await marketplaceRepository.claimListingForBuyer({ listingId, buyerId }, client);

	if (claimedRows === 0) {
		throw badRequest('This offer was just bought by someone else', 409);
	}

	const fee = roundMoney((total * FEE_PERCENT) / 100);
	const sellerProceeds = roundMoney(total - fee);
	const reference = `listing:${listingId}`;

	const buyerResult = await walletRepository.applyBalanceChange(
		{
			walletId: buyerWallet.id,
			type: 'purchase',
			amount: total,
			signedAmount: -total,
			description: `Bought ${listing.shareCount} shares of "${listing.assetTitle}"`,
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
				? `Sold ${listing.shareCount} shares of "${listing.assetTitle}" (less ${fee} Credits platform fee)`
				: `Sold ${listing.shareCount} shares of "${listing.assetTitle}"`,
			referenceId: reference,
		},
		client
	);

	const buyerHolding = await fractionalRepository.getHolding(listing.assetId, buyerId, client);

	await fractionalRepository.setHolding(
		{
			assetId: listing.assetId,
			userId: listing.sellerId,
			shares: sellerHolding.shares - listing.shareCount,
			totalShares: fractional.totalShares,
		},
		client
	);

	await fractionalRepository.setHolding(
		{
			assetId: listing.assetId,
			userId: buyerId,
			shares: (buyerHolding ? buyerHolding.shares : 0) + listing.shareCount,
			totalShares: fractional.totalShares,
		},
		client
	);

	const block = await blockchainService.mineBlock(
		{ assetId: listing.assetId, ownerId: buyerId, action: 'ownership_fractional_sale' },
		client
	);

	const historyEntry = await ownershipRepository.createHistoryEntry(
		{
			assetId: listing.assetId,
			previousOwner: listing.sellerId,
			newOwner: buyerId,
			transferType: 'fractional_sale',
			blockchainBlockId: block.id,
		},
		client
	);

	// A buyer who ends up holding every share becomes the asset's owner of
	// record, so the asset is whole again and can be sold outright.
	const updatedBuyerHolding = await fractionalRepository.getHolding(listing.assetId, buyerId, client);
	const consolidated = updatedBuyerHolding && updatedBuyerHolding.shares === fractional.totalShares;

	if (consolidated && listing.assetOwnerId !== buyerId) {
		await ownershipRepository.updateAssetOwner(
			{ assetId: listing.assetId, expectedOwnerId: listing.assetOwnerId, newOwnerId: buyerId },
			client
		);
	}

	return {
		listing: await marketplaceRepository.getListingById(listingId, client),
		shareCount: listing.shareCount,
		pricePerShare: listing.price,
		price: total,
		fee,
		sellerProceeds,
		consolidated: Boolean(consolidated),
		wallet: buyerResult.wallet,
		transaction: buyerResult.transaction,
		holdings: await fractionalRepository.getHoldings(listing.assetId, client),
		ownership: historyEntry,
		block,
	};
}

/**
 * Whether a whole-asset sale or auction is allowed. Once an asset is split,
 * selling the whole thing would sell other people's shares out from under
 * them unless the seller holds all of them.
 */
async function assertWholeAssetSaleAllowed(assetId, userId) {
	const fractional = await fractionalRepository.getFractionalAsset(assetId);

	if (!fractional) {
		return;
	}

	const holding = await fractionalRepository.getHolding(assetId, userId);

	if (!holding || holding.shares !== fractional.totalShares) {
		throw badRequest(
			'This asset is split into shares held by more than one owner, so it cannot be sold whole. Sell your shares instead.',
			409
		);
	}
}

module.exports = {
	fractionalizeAsset,
	getShares,
	buildFractionalFields,
	purchaseShares,
	assertWholeAssetSaleAllowed,
};
