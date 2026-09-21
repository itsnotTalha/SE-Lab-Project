const { withTransaction } = require('../../database/database');
const auctionRepository = require('../../repositories/auctionRepository');
const marketplaceRepository = require('../../repositories/marketplaceRepository');
const walletRepository = require('../../repositories/walletRepository');
const ownershipService = require('../ownership/ownershipService');

const FEE_PERCENT = Number(process.env.MARKETPLACE_FEE_PERCENT || 0);

const MIN_AUCTION_MINUTES = 1;
const MAX_AUCTION_DAYS = 30;
const DEFAULT_BID_INCREMENT = 1;

function badRequest(message, status = 400) {
	const error = new Error(message);
	error.status = status;

	return error;
}

function roundMoney(value) {
	return Math.round(value * 100) / 100;
}

/**
 * Bids are stored in UTC ISO form so they compare correctly against SQLite's
 * CURRENT_TIMESTAMP, which is also UTC.
 */
function toSqlTimestamp(date) {
	return date.toISOString().slice(0, 19).replace('T', ' ');
}

function parseEndsAt(value) {
	if (!value) {
		throw badRequest('endsAt is required for an auction listing');
	}

	const endsAt = new Date(value);

	if (Number.isNaN(endsAt.getTime())) {
		throw badRequest('endsAt must be a valid date and time');
	}

	const now = Date.now();
	const minimumEnd = now + MIN_AUCTION_MINUTES * 60 * 1000;
	const maximumEnd = now + MAX_AUCTION_DAYS * 24 * 60 * 60 * 1000;

	if (endsAt.getTime() < minimumEnd) {
		throw badRequest(`An auction must run for at least ${MIN_AUCTION_MINUTES} minute`);
	}

	if (endsAt.getTime() > maximumEnd) {
		throw badRequest(`An auction may not run for longer than ${MAX_AUCTION_DAYS} days`);
	}

	return toSqlTimestamp(endsAt);
}

/**
 * Validates the auction-specific half of a create-listing request. The shared
 * ownership and verification rules are applied by marketplaceService before
 * this runs.
 */
function buildAuctionFields({ startingPrice, reservePrice, minBidIncrement, endsAt }) {
	const numericStart = Number(startingPrice);

	if (!Number.isFinite(numericStart) || numericStart <= 0) {
		throw badRequest('startingPrice must be a positive number');
	}

	let numericReserve = null;

	if (reservePrice != null && reservePrice !== '') {
		numericReserve = Number(reservePrice);

		if (!Number.isFinite(numericReserve) || numericReserve <= 0) {
			throw badRequest('reservePrice must be a positive number');
		}

		if (numericReserve < numericStart) {
			throw badRequest('reservePrice must not be below startingPrice');
		}
	}

	let numericIncrement = DEFAULT_BID_INCREMENT;

	if (minBidIncrement != null && minBidIncrement !== '') {
		numericIncrement = Number(minBidIncrement);

		if (!Number.isFinite(numericIncrement) || numericIncrement <= 0) {
			throw badRequest('minBidIncrement must be a positive number');
		}
	}

	return {
		// `price` holds the starting price until a sale settles, at which point
		// it is overwritten with the winning bid so trade history and the
		// wallet ledger agree on what was actually paid.
		price: roundMoney(numericStart),
		startingPrice: roundMoney(numericStart),
		reservePrice: numericReserve == null ? null : roundMoney(numericReserve),
		minBidIncrement: roundMoney(numericIncrement),
		endsAt: parseEndsAt(endsAt),
	};
}

function hasEnded(listing) {
	return Boolean(listing.endsAt) && new Date(`${listing.endsAt.replace(' ', 'T')}Z`).getTime() <= Date.now();
}

function minimumAcceptableBid(listing, winningBid) {
	if (!winningBid) {
		return roundMoney(listing.startingPrice);
	}

	return roundMoney(winningBid.amount + (listing.minBidIncrement || DEFAULT_BID_INCREMENT));
}

/**
 * Places a bid.
 *
 * A bid immediately debits the bidder, so the funds behind it are committed
 * and cannot be spent elsewhere or bid twice. Being outbid credits the money
 * straight back. This is what stops an auction from closing on a winner who
 * can no longer pay.
 */
async function placeBid(bidderId, listingId, amount) {
	const numericAmount = Number(amount);

	if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
		throw badRequest('amount must be a positive number');
	}

	const bidAmount = roundMoney(numericAmount);

	return withTransaction(async (client) => {
		const listing = await marketplaceRepository.getListingById(listingId, client);

		if (!listing) {
			throw badRequest('Listing not found', 404);
		}

		if (listing.listingType !== 'auction') {
			throw badRequest('This listing is not an auction', 409);
		}

		if (listing.status !== 'active') {
			throw badRequest(`This auction is no longer open (${listing.status})`, 409);
		}

		if (hasEnded(listing)) {
			throw badRequest('This auction has already ended', 409);
		}

		if (listing.sellerId === bidderId) {
			throw badRequest('You cannot bid on your own auction', 400);
		}

		const winningBid = await auctionRepository.getWinningBid(listingId, client);
		const minimumBid = minimumAcceptableBid(listing, winningBid);

		if (bidAmount < minimumBid) {
			throw badRequest(`Your bid must be at least ${minimumBid} Credits`, 400);
		}

		const bidderWallet = await walletRepository.getWalletByUserId(bidderId, client);

		if (!bidderWallet) {
			throw badRequest('Wallet not found', 404);
		}

		// A bidder raising their own bid gets the earlier hold back first, so
		// they only need the difference rather than the full new amount.
		const ownHeldBids = (await auctionRepository.getHeldBids(listingId, client)).filter(
			(bid) => bid.bidderId === bidderId
		);

		for (const ownBid of ownHeldBids) {
			await auctionRepository.updateBidStatus(ownBid.id, 'released', client);
			await walletRepository.applyBalanceChange(
				{
					walletId: bidderWallet.id,
					type: 'bid_release',
					amount: ownBid.amount,
					signedAmount: ownBid.amount,
					description: `Previous bid on "${listing.assetTitle}" returned`,
					referenceId: `listing:${listingId}`,
				},
				client
			);
		}

		const refreshedWallet = await walletRepository.getWalletByUserId(bidderId, client);

		if (refreshedWallet.balance < bidAmount) {
			throw badRequest(
				`Insufficient wallet balance — this bid needs ${bidAmount} Credits and your balance is ${refreshedWallet.balance}`,
				402
			);
		}

		await walletRepository.applyBalanceChange(
			{
				walletId: refreshedWallet.id,
				type: 'bid_hold',
				amount: bidAmount,
				signedAmount: -bidAmount,
				description: `Bid held for "${listing.assetTitle}"`,
				referenceId: `listing:${listingId}`,
			},
			client
		);

		// Return the outbid leader's funds.
		if (winningBid && winningBid.bidderId !== bidderId) {
			const previousWallet = await walletRepository.getWalletByUserId(winningBid.bidderId, client);

			await auctionRepository.updateBidStatus(winningBid.id, 'outbid', client);
			await walletRepository.applyBalanceChange(
				{
					walletId: previousWallet.id,
					type: 'bid_release',
					amount: winningBid.amount,
					signedAmount: winningBid.amount,
					description: `Outbid on "${listing.assetTitle}" — funds returned`,
					referenceId: `listing:${listingId}`,
				},
				client
			);
		}

		const bid = await auctionRepository.createBid(
			{ listingId, bidderId, amount: bidAmount },
			client
		);

		return {
			bid,
			wallet: await walletRepository.getWalletByUserId(bidderId, client),
			listing: await marketplaceRepository.getListingById(listingId, client),
		};
	});
}

/**
 * Settles one auction whose time is up.
 *
 * Runs in a single transaction: the winner's held funds pay the seller, the
 * asset changes hands, the ledger records it and the listing is marked sold.
 * If nothing met the reserve, every remaining hold is returned and the listing
 * closes unsold.
 */
async function settleAuction(listingId, client) {
	const listing = await marketplaceRepository.getListingById(listingId, client);

	if (!listing || listing.listingType !== 'auction' || listing.status !== 'active') {
		return null;
	}

	if (!hasEnded(listing)) {
		return null;
	}

	const winningBid = await auctionRepository.getWinningBid(listingId, client);
	const reserveMet = winningBid && (listing.reservePrice == null || winningBid.amount >= listing.reservePrice);

	if (!winningBid || !reserveMet) {
		// No sale: return every held bid, including one that fell short of the
		// reserve, and close the listing.
		for (const heldBid of await auctionRepository.getHeldBids(listingId, client)) {
			const wallet = await walletRepository.getWalletByUserId(heldBid.bidderId, client);

			await auctionRepository.updateBidStatus(heldBid.id, 'released', client);
			await walletRepository.applyBalanceChange(
				{
					walletId: wallet.id,
					type: 'bid_release',
					amount: heldBid.amount,
					signedAmount: heldBid.amount,
					description: winningBid
						? `Auction for "${listing.assetTitle}" ended below its reserve — funds returned`
						: `Auction for "${listing.assetTitle}" ended — funds returned`,
					referenceId: `listing:${listingId}`,
				},
				client
			);
		}

		const closed = await marketplaceRepository.closeListing(listingId, client);

		return { listing: closed, sold: false, winningBid: winningBid || null };
	}

	const price = roundMoney(winningBid.amount);
	const fee = roundMoney((price * FEE_PERCENT) / 100);
	const sellerProceeds = roundMoney(price - fee);
	const reference = `listing:${listingId}`;

	const claimedRows = await marketplaceRepository.claimListingForBuyer(
		{ listingId, buyerId: winningBid.bidderId },
		client
	);

	if (claimedRows === 0) {
		return null;
	}

	await auctionRepository.updateBidStatus(winningBid.id, 'won', client);

	const buyerWallet = await walletRepository.getWalletByUserId(winningBid.bidderId, client);
	const sellerWallet = await walletRepository.getWalletByUserId(listing.sellerId, client);

	// The winner's money was already taken when the bid was placed. Returning
	// the hold and then charging the purchase nets to zero, but leaves a ledger
	// where every row's amount matches what it actually did, instead of one
	// purchase row that moved no money.
	await walletRepository.applyBalanceChange(
		{
			walletId: buyerWallet.id,
			type: 'bid_release',
			amount: price,
			signedAmount: price,
			description: `Winning bid on "${listing.assetTitle}" released to settle the purchase`,
			referenceId: reference,
		},
		client
	);

	await walletRepository.applyBalanceChange(
		{
			walletId: buyerWallet.id,
			type: 'purchase',
			amount: price,
			signedAmount: -price,
			description: `Won the auction for "${listing.assetTitle}"`,
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
				? `Auction sale of "${listing.assetTitle}" (${price} Credits less ${fee} Credits platform fee)`
				: `Auction sale of "${listing.assetTitle}"`,
			referenceId: reference,
		},
		client
	);

	const { historyEntry, block } = await ownershipService.transferOwnership(
		{
			assetId: listing.assetId,
			fromUserId: listing.sellerId,
			toUserId: winningBid.bidderId,
			transferType: 'sale',
		},
		client
	);

	// Record what the asset actually sold for, rather than leaving the
	// starting price in place.
	await marketplaceRepository.updateListing(listingId, { price }, client);

	return {
		listing: await marketplaceRepository.getListingById(listingId, client),
		sold: true,
		winningBid,
		price,
		fee,
		sellerProceeds,
		ownership: historyEntry,
		block,
	};
}

/**
 * Settles every auction whose end time has passed.
 *
 * There is no scheduler in this app, so this is called before auctions are
 * read or browsed. That keeps the outcome correct whenever anyone actually
 * looks, and the operation is idempotent, so calling it often is harmless.
 */
async function settleExpiredAuctions() {
	const expiredIds = await auctionRepository.getExpiredActiveAuctionIds();
	const results = [];

	for (const listingId of expiredIds) {
		const result = await withTransaction((client) => settleAuction(listingId, client));

		if (result) {
			results.push(result);
		}
	}

	return results;
}

/**
 * Ends an auction early. Only the seller may do this, and only while no bids
 * are held — cancelling out from under a committed bidder would not be fair.
 */
async function cancelAuction(userId, listingId) {
	return withTransaction(async (client) => {
		const listing = await marketplaceRepository.getListingById(listingId, client);

		if (!listing) {
			throw badRequest('Listing not found', 404);
		}

		if (listing.sellerId !== userId) {
			throw badRequest('You do not own this listing', 403);
		}

		if (listing.listingType !== 'auction') {
			throw badRequest('This listing is not an auction', 409);
		}

		if (listing.status !== 'active') {
			throw badRequest(`This auction is already ${listing.status}`, 409);
		}

		const heldBids = await auctionRepository.getHeldBids(listingId, client);

		if (heldBids.length > 0) {
			throw badRequest('An auction with live bids cannot be cancelled', 409);
		}

		return marketplaceRepository.closeListing(listingId, client);
	});
}

async function getBids(listingId) {
	const listing = await marketplaceRepository.getListingById(listingId);

	if (!listing) {
		throw badRequest('Listing not found', 404);
	}

	return auctionRepository.getBidsByListingId(listingId);
}

module.exports = {
	buildAuctionFields,
	placeBid,
	settleAuction,
	settleExpiredAuctions,
	cancelAuction,
	getBids,
	hasEnded,
	minimumAcceptableBid,
};
