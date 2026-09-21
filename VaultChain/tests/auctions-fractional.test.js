const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, beforeEach, describe, it } = require('node:test');

const testDatabasePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vaultchain-auction-')), 'test.sqlite');
process.env.DATABASE_PATH = testDatabasePath;
process.env.MARKETPLACE_FEE_PERCENT = '0';

const { initializeDatabase } = require('../server/src/database/initDatabase');
const { run } = require('../server/src/database/database');
const marketplaceService = require('../server/src/services/marketplace/marketplaceService');
const walletService = require('../server/src/services/wallet/walletService');
const blockchainService = require('../server/src/services/blockchain/blockchainService');
const assetRepository = require('../server/src/repositories/assetRepository');
const authRepository = require('../server/src/repositories/authRepository');
const walletRepository = require('../server/src/repositories/walletRepository');

let userCounter = 0;

async function createUser(fullName, startingBalance = 0) {
	userCounter += 1;

	const user = await authRepository.createUserWithWallet({
		fullName,
		email: `auction-user${userCounter}@example.com`,
		passwordHash: 'not-a-real-hash',
	});

	if (startingBalance > 0) {
		await walletService.addTransaction(user.id, {
			type: 'deposit',
			amount: startingBalance,
			description: 'Test top-up',
		});
	}

	return user;
}

async function createAsset(ownerId, title) {
	return assetRepository.createAsset({
		ownerId,
		title,
		description: null,
		category: 'art',
		fileName: `${title}.png`,
		filePath: `/tmp/${title}.png`,
		fileSize: 1024,
		mimeType: 'image/png',
	});
}

async function balanceOf(userId) {
	const wallet = await walletRepository.getWalletByUserId(userId);

	return wallet.balance;
}

function inMinutes(minutes) {
	return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

/** Forces an auction to have ended, without waiting for the clock. */
async function expireAuction(listingId) {
	const past = new Date(Date.now() - 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

	await run('UPDATE marketplace_listings SET ends_at = ? WHERE id = ?', [past, listingId]);
}

// Both suites share the one temporary database, so it is set up and torn down
// at file level. A tear-down inside the first suite would delete the database
// while the second suite was still running.
before(async () => {
	await initializeDatabase();
});

after(() => {
	fs.rmSync(path.dirname(testDatabasePath), { recursive: true, force: true });
});

describe('Auctions', () => {
	beforeEach(async () => {
		for (const table of [
			'auction_bids',
			'marketplace_listings',
			'fractional_ownership',
			'fractional_assets',
			'ownership_history',
			'blockchain_blocks',
			'wallet_transactions',
			'assets',
			'wallets',
			'users',
		]) {
			await run(`DELETE FROM ${table}`);
		}
	});

	async function createAuction({ startingPrice = 100, reservePrice = null, minutes = 60 } = {}) {
		const seller = await createUser('Seller');
		const asset = await createAsset(seller.id, 'Auction Piece');
		const listing = await marketplaceService.createListing(seller.id, {
			assetId: asset.id,
			listingType: 'auction',
			startingPrice,
			reservePrice,
			minBidIncrement: 10,
			endsAt: inMinutes(minutes),
		});

		return { seller, asset, listing };
	}

	it('creates an auction with a starting price and an end time', async () => {
		const { listing } = await createAuction();

		assert.equal(listing.listingType, 'auction');
		assert.equal(listing.startingPrice, 100);
		assert.equal(listing.status, 'active');
		assert.ok(listing.endsAt);
	});

	it('rejects an auction with no end time, a past end time, or a reserve below the start', async () => {
		const seller = await createUser('Seller');
		const asset = await createAsset(seller.id, 'Auction Piece');

		const base = { assetId: asset.id, listingType: 'auction', startingPrice: 100 };

		await assert.rejects(
			marketplaceService.createListing(seller.id, base),
			(error) => error.status === 400
		);
		await assert.rejects(
			marketplaceService.createListing(seller.id, { ...base, endsAt: inMinutes(-10) }),
			(error) => error.status === 400
		);
		await assert.rejects(
			marketplaceService.createListing(seller.id, {
				...base,
				reservePrice: 50,
				endsAt: inMinutes(60),
			}),
			(error) => error.status === 400
		);
	});

	it('holds the bidder funds when a bid is placed', async () => {
		const { listing } = await createAuction();
		const bidder = await createUser('Bidder', 500);

		const result = await marketplaceService.placeBid(bidder.id, listing.id, 100);

		assert.equal(result.bid.amount, 100);
		assert.equal(result.bid.status, 'held');
		assert.equal(await balanceOf(bidder.id), 400);
	});

	it('refuses a bid below the starting price or below the increment', async () => {
		const { listing } = await createAuction();
		const bidder = await createUser('Bidder', 500);
		const other = await createUser('Other bidder', 500);

		await assert.rejects(
			marketplaceService.placeBid(bidder.id, listing.id, 90),
			(error) => error.status === 400
		);

		await marketplaceService.placeBid(bidder.id, listing.id, 100);

		// Needs at least 100 + the 10 increment.
		await assert.rejects(
			marketplaceService.placeBid(other.id, listing.id, 105),
			(error) => error.status === 400
		);
	});

	it('refuses a bid the bidder cannot cover, and a bid from the seller', async () => {
		const { seller, listing } = await createAuction();
		const poorBidder = await createUser('Poor bidder', 50);

		await assert.rejects(
			marketplaceService.placeBid(poorBidder.id, listing.id, 100),
			(error) => error.status === 402
		);
		await assert.rejects(
			marketplaceService.placeBid(seller.id, listing.id, 100),
			(error) => error.status === 400
		);
	});

	it('returns the funds of an outbid bidder', async () => {
		const { listing } = await createAuction();
		const first = await createUser('First', 500);
		const second = await createUser('Second', 500);

		await marketplaceService.placeBid(first.id, listing.id, 100);
		assert.equal(await balanceOf(first.id), 400);

		await marketplaceService.placeBid(second.id, listing.id, 150);

		assert.equal(await balanceOf(first.id), 500, 'outbid funds should be returned');
		assert.equal(await balanceOf(second.id), 350);
	});

	it('only charges the difference when a bidder raises their own bid', async () => {
		const { listing } = await createAuction();
		const bidder = await createUser('Bidder', 300);

		await marketplaceService.placeBid(bidder.id, listing.id, 100);
		await marketplaceService.placeBid(bidder.id, listing.id, 250);

		assert.equal(await balanceOf(bidder.id), 50);
	});

	it('settles to the highest bidder when the auction ends', async () => {
		const { seller, asset, listing } = await createAuction();
		const loser = await createUser('Loser', 500);
		const winner = await createUser('Winner', 500);

		await marketplaceService.placeBid(loser.id, listing.id, 100);
		await marketplaceService.placeBid(winner.id, listing.id, 200);
		await expireAuction(listing.id);

		const [result] = await marketplaceService.settleExpiredAuctions();

		assert.equal(result.sold, true);
		assert.equal(result.price, 200);
		assert.equal(result.listing.status, 'sold');
		assert.equal(result.listing.buyerId, winner.id);

		assert.equal(await balanceOf(winner.id), 300);
		assert.equal(await balanceOf(seller.id), 200);
		assert.equal(await balanceOf(loser.id), 500, 'the losing bid should have been returned');

		const ownedAsset = await assetRepository.getAssetById(asset.id);
		assert.equal(ownedAsset.ownerId, winner.id);

		assert.equal((await blockchainService.verifyChain()).valid, true);
	});

	it('returns every bid and sells nothing when the reserve is not met', async () => {
		const { seller, asset, listing } = await createAuction({ startingPrice: 100, reservePrice: 500 });
		const bidder = await createUser('Bidder', 500);

		await marketplaceService.placeBid(bidder.id, listing.id, 200);
		await expireAuction(listing.id);

		const [result] = await marketplaceService.settleExpiredAuctions();

		assert.equal(result.sold, false);
		assert.equal(result.listing.status, 'closed');
		assert.equal(await balanceOf(bidder.id), 500);
		assert.equal(await balanceOf(seller.id), 0);

		const ownedAsset = await assetRepository.getAssetById(asset.id);
		assert.equal(ownedAsset.ownerId, seller.id);
	});

	it('closes an auction that drew no bids at all', async () => {
		const { listing } = await createAuction();

		await expireAuction(listing.id);
		const [result] = await marketplaceService.settleExpiredAuctions();

		assert.equal(result.sold, false);
		assert.equal(result.listing.status, 'closed');
	});

	it('refuses bids once the auction has ended, and settles on read', async () => {
		const { listing } = await createAuction();
		const bidder = await createUser('Bidder', 500);
		const lateBidder = await createUser('Late', 500);

		await marketplaceService.placeBid(bidder.id, listing.id, 100);
		await expireAuction(listing.id);

		await assert.rejects(
			marketplaceService.placeBid(lateBidder.id, listing.id, 200),
			(error) => error.status === 409
		);

		// Reading the listing settles it rather than showing a finished auction
		// as still open.
		const detail = await marketplaceService.getListingById(listing.id);
		assert.equal(detail.status, 'sold');
	});

	it('refuses to buy an auction outright', async () => {
		const { listing } = await createAuction();
		const buyer = await createUser('Buyer', 500);

		await assert.rejects(
			marketplaceService.purchaseListing(buyer.id, listing.id),
			(error) => error.status === 409
		);
	});

	it('will not change or cancel an auction that has live bids', async () => {
		const { seller, listing } = await createAuction();
		const bidder = await createUser('Bidder', 500);

		await marketplaceService.placeBid(bidder.id, listing.id, 100);

		await assert.rejects(
			marketplaceService.cancelAuction(seller.id, listing.id),
			(error) => error.status === 409
		);
		await assert.rejects(
			marketplaceService.deleteListing(seller.id, listing.id),
			(error) => error.status === 409
		);
		await assert.rejects(
			marketplaceService.updateListing(seller.id, listing.id, { price: 5 }),
			(error) => error.status === 409
		);
	});

	it('lets the seller cancel an auction that has no bids', async () => {
		const { seller, listing } = await createAuction();

		const cancelled = await marketplaceService.cancelAuction(seller.id, listing.id);

		assert.equal(cancelled.status, 'closed');
	});

	it('refuses to let anyone but the seller cancel', async () => {
		const { listing } = await createAuction();
		const stranger = await createUser('Stranger', 100);

		await assert.rejects(
			marketplaceService.cancelAuction(stranger.id, listing.id),
			(error) => error.status === 403
		);
	});
});

describe('Fractional ownership', () => {
	beforeEach(async () => {
		for (const table of [
			'auction_bids',
			'marketplace_listings',
			'fractional_ownership',
			'fractional_assets',
			'ownership_history',
			'blockchain_blocks',
			'wallet_transactions',
			'assets',
			'wallets',
			'users',
		]) {
			await run(`DELETE FROM ${table}`);
		}
	});

	async function splitAsset(totalShares = 100) {
		const owner = await createUser('Owner');
		const asset = await createAsset(owner.id, 'Shared Piece');

		await marketplaceService.fractionalizeAsset(owner.id, asset.id, totalShares);

		return { owner, asset };
	}

	it('splits an asset and gives the owner every share', async () => {
		const { owner, asset } = await splitAsset(100);

		const { fractional, holdings } = await marketplaceService.getShares(asset.id);

		assert.equal(fractional.totalShares, 100);
		assert.equal(holdings.length, 1);
		assert.equal(holdings[0].userId, owner.id);
		assert.equal(holdings[0].shares, 100);
		assert.equal(holdings[0].percentage, 100);
	});

	it('refuses to split an asset twice, one you do not own, or into too few shares', async () => {
		const { owner, asset } = await splitAsset(100);
		const stranger = await createUser('Stranger');

		await assert.rejects(
			marketplaceService.fractionalizeAsset(owner.id, asset.id, 50),
			(error) => error.status === 409
		);

		const other = await createAsset(owner.id, 'Another');
		await assert.rejects(
			marketplaceService.fractionalizeAsset(stranger.id, other.id, 100),
			(error) => error.status === 403
		);
		await assert.rejects(
			marketplaceService.fractionalizeAsset(owner.id, other.id, 1),
			(error) => error.status === 400
		);
	});

	it('sells a block of shares, moving shares and money together', async () => {
		const { owner, asset } = await splitAsset(100);
		const buyer = await createUser('Buyer', 1000);

		const listing = await marketplaceService.createListing(owner.id, {
			assetId: asset.id,
			listingType: 'fractional',
			shareCount: 25,
			price: 10,
		});

		assert.equal(listing.shareCount, 25);

		const purchase = await marketplaceService.purchaseListing(buyer.id, listing.id);

		assert.equal(purchase.price, 250);
		assert.equal(await balanceOf(buyer.id), 750);
		assert.equal(await balanceOf(owner.id), 250);

		const { holdings } = await marketplaceService.getShares(asset.id);
		const byUser = new Map(holdings.map((holding) => [holding.userId, holding]));

		assert.equal(byUser.get(owner.id).shares, 75);
		assert.equal(byUser.get(owner.id).percentage, 75);
		assert.equal(byUser.get(buyer.id).shares, 25);
		assert.equal(byUser.get(buyer.id).percentage, 25);

		assert.equal((await blockchainService.verifyChain()).valid, true);
	});

	it('refuses to offer more shares than the seller holds', async () => {
		const { owner, asset } = await splitAsset(100);

		await assert.rejects(
			marketplaceService.createListing(owner.id, {
				assetId: asset.id,
				listingType: 'fractional',
				shareCount: 200,
				price: 10,
			}),
			(error) => error.status === 409
		);
	});

	it('refuses a share purchase the buyer cannot afford, and changes nothing', async () => {
		const { owner, asset } = await splitAsset(100);
		const buyer = await createUser('Buyer', 100);

		const listing = await marketplaceService.createListing(owner.id, {
			assetId: asset.id,
			listingType: 'fractional',
			shareCount: 25,
			price: 10,
		});

		await assert.rejects(
			marketplaceService.purchaseListing(buyer.id, listing.id),
			(error) => error.status === 402
		);

		assert.equal(await balanceOf(buyer.id), 100);
		const { holdings } = await marketplaceService.getShares(asset.id);
		assert.equal(holdings.length, 1);
		assert.equal(holdings[0].shares, 100);
	});

	it('lets several co-owners each offer shares at the same time', async () => {
		const { owner, asset } = await splitAsset(100);
		const buyer = await createUser('Buyer', 1000);

		const firstOffer = await marketplaceService.createListing(owner.id, {
			assetId: asset.id,
			listingType: 'fractional',
			shareCount: 40,
			price: 5,
		});
		await marketplaceService.purchaseListing(buyer.id, firstOffer.id);

		// Both holders now have an active offer for the same asset, which the
		// one-active-listing rule must allow for fractional listings.
		const ownerOffer = await marketplaceService.createListing(owner.id, {
			assetId: asset.id,
			listingType: 'fractional',
			shareCount: 10,
			price: 6,
		});
		const buyerOffer = await marketplaceService.createListing(buyer.id, {
			assetId: asset.id,
			listingType: 'fractional',
			shareCount: 10,
			price: 7,
		});

		assert.equal(ownerOffer.status, 'active');
		assert.equal(buyerOffer.status, 'active');

		// But not two offers from the same holder.
		await assert.rejects(
			marketplaceService.createListing(owner.id, {
				assetId: asset.id,
				listingType: 'fractional',
				shareCount: 5,
				price: 8,
			}),
			(error) => error.status === 409
		);
	});

	it('blocks a whole-asset sale while other people hold shares', async () => {
		const { owner, asset } = await splitAsset(100);
		const buyer = await createUser('Buyer', 1000);

		const offer = await marketplaceService.createListing(owner.id, {
			assetId: asset.id,
			listingType: 'fractional',
			shareCount: 25,
			price: 10,
		});
		await marketplaceService.purchaseListing(buyer.id, offer.id);

		await assert.rejects(
			marketplaceService.createListing(owner.id, {
				assetId: asset.id,
				listingType: 'sale',
				price: 5000,
			}),
			(error) => error.status === 409
		);
	});

	it('allows a whole-asset sale again once one holder owns every share', async () => {
		const { owner, asset } = await splitAsset(100);
		const buyer = await createUser('Buyer', 5000);

		const offer = await marketplaceService.createListing(owner.id, {
			assetId: asset.id,
			listingType: 'fractional',
			shareCount: 100,
			price: 10,
		});
		const purchase = await marketplaceService.purchaseListing(buyer.id, offer.id);

		assert.equal(purchase.consolidated, true);

		// The buyer now holds everything, so the asset is whole again and they
		// become its owner of record.
		const ownedAsset = await assetRepository.getAssetById(asset.id);
		assert.equal(ownedAsset.ownerId, buyer.id);

		const listing = await marketplaceService.createListing(buyer.id, {
			assetId: asset.id,
			listingType: 'sale',
			price: 5000,
		});
		assert.equal(listing.status, 'active');
	});

	it('refuses to split an asset that is currently listed', async () => {
		const owner = await createUser('Owner');
		const asset = await createAsset(owner.id, 'Listed Piece');

		await marketplaceService.createListing(owner.id, {
			assetId: asset.id,
			listingType: 'sale',
			price: 100,
		});

		await assert.rejects(
			marketplaceService.fractionalizeAsset(owner.id, asset.id, 100),
			(error) => error.status === 409
		);
	});

	it('refuses to list shares in an asset that was never split', async () => {
		const owner = await createUser('Owner');
		const asset = await createAsset(owner.id, 'Whole Piece');

		await assert.rejects(
			marketplaceService.createListing(owner.id, {
				assetId: asset.id,
				listingType: 'fractional',
				shareCount: 10,
				price: 5,
			}),
			(error) => error.status === 409
		);
	});
});
