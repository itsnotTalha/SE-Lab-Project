const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, beforeEach, describe, it } = require('node:test');

// Point the database at a throwaway file before anything requires the
// connection module, which resolves its path at import time.
const testDatabasePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vaultchain-test-')), 'test.sqlite');
process.env.DATABASE_PATH = testDatabasePath;
process.env.MARKETPLACE_FEE_PERCENT = '0';

const { initializeDatabase } = require('../server/src/database/initDatabase');
const { run, get } = require('../server/src/database/database');
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
		email: `user${userCounter}@example.com`,
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

describe('Marketplace module', () => {
	before(async () => {
		await initializeDatabase();
	});

	after(() => {
		fs.rmSync(path.dirname(testDatabasePath), { recursive: true, force: true });
	});

	beforeEach(async () => {
		// Each test starts from an empty database so ids and balances from one
		// test cannot leak into the next.
		for (const table of [
			'marketplace_listings',
			'ownership_history',
			'blockchain_blocks',
			'wallet_transactions',
			'asset_hashes',
			'asset_metadata',
			'verification_reports',
			'assets',
			'wallets',
			'users',
		]) {
			await run(`DELETE FROM ${table}`);
		}
	});

	describe('creating a listing', () => {
		it('AC-1: lists an asset the seller owns', async () => {
			const seller = await createUser('Seller');
			const asset = await createAsset(seller.id, 'Sunrise');

			const listing = await marketplaceService.createListing(seller.id, {
				assetId: asset.id,
				listingType: 'sale',
				price: 50,
			});

			assert.equal(listing.status, 'active');
			assert.equal(listing.price, 50);
			assert.equal(listing.assetTitle, 'Sunrise');

			const { listings } = await marketplaceService.getListings();
			assert.equal(listings.length, 1);
			assert.equal(listings[0].id, listing.id);
		});

		it('AC-2: refuses a second active listing for the same asset', async () => {
			const seller = await createUser('Seller');
			const asset = await createAsset(seller.id, 'Sunrise');

			await marketplaceService.createListing(seller.id, { assetId: asset.id, listingType: 'sale', price: 50 });

			await assert.rejects(
				marketplaceService.createListing(seller.id, { assetId: asset.id, listingType: 'sale', price: 70 }),
				(error) => error.status === 409
			);

			const { pagination } = await marketplaceService.getListings();
			assert.equal(pagination.total, 1);
		});

		it('AC-3: refuses to list an asset the user does not own', async () => {
			const seller = await createUser('Seller');
			const stranger = await createUser('Stranger');
			const asset = await createAsset(seller.id, 'Sunrise');

			await assert.rejects(
				marketplaceService.createListing(stranger.id, { assetId: asset.id, listingType: 'sale', price: 50 }),
				(error) => error.status === 403
			);
		});

		it('rejects a price that is zero, negative or not a number', async () => {
			const seller = await createUser('Seller');
			const asset = await createAsset(seller.id, 'Sunrise');

			for (const price of [0, -10, 'free', Number.NaN, Number.POSITIVE_INFINITY]) {
				await assert.rejects(
					marketplaceService.createListing(seller.id, { assetId: asset.id, listingType: 'sale', price }),
					(error) => error.status === 400
				);
			}
		});

		it('rejects listing types that nothing can fulfil yet', async () => {
			const seller = await createUser('Seller');
			const asset = await createAsset(seller.id, 'Sunrise');

			for (const listingType of ['auction', 'rent', 'giveaway']) {
				await assert.rejects(
					marketplaceService.createListing(seller.id, { assetId: asset.id, listingType, price: 50 }),
					(error) => error.status === 400
				);
			}
		});

		it('AC-10: refuses to list an asset whose latest verification says duplicate', async () => {
			const seller = await createUser('Seller');
			const asset = await createAsset(seller.id, 'Sunrise');

			await run(`INSERT INTO verification_reports (asset_id, verification_type, status) VALUES (?, ?, ?)`, [
				asset.id,
				'image',
				'duplicate',
			]);

			await assert.rejects(
				marketplaceService.createListing(seller.id, { assetId: asset.id, listingType: 'sale', price: 50 }),
				(error) => error.status === 422
			);
		});
	});

	describe('buying a listing', () => {
		async function setUpSale({ buyerBalance = 100, price = 50 } = {}) {
			const seller = await createUser('Seller');
			const buyer = await createUser('Buyer', buyerBalance);
			const asset = await createAsset(seller.id, 'Sunrise');
			const listing = await marketplaceService.createListing(seller.id, {
				assetId: asset.id,
				listingType: 'sale',
				price,
			});

			return { seller, buyer, asset, listing };
		}

		it('AC-4: moves money, ownership, history and the ledger together', async () => {
			const { seller, buyer, asset, listing } = await setUpSale();

			const purchase = await marketplaceService.purchaseListing(buyer.id, listing.id);

			assert.equal(await balanceOf(buyer.id), 50);
			assert.equal(await balanceOf(seller.id), 50);

			const soldListing = await marketplaceService.getListingById(listing.id);
			assert.equal(soldListing.status, 'sold');
			assert.equal(soldListing.buyerId, buyer.id);
			assert.ok(soldListing.soldAt);

			const ownedAsset = await assetRepository.getAssetById(asset.id);
			assert.equal(ownedAsset.ownerId, buyer.id);

			const saleEntry = soldListing.ownershipHistory.find((entry) => entry.transferType === 'sale');
			assert.ok(saleEntry, 'expected a sale entry in the ownership history');
			assert.equal(saleEntry.previousOwner, seller.id);
			assert.equal(saleEntry.newOwner, buyer.id);
			assert.equal(saleEntry.blockchainBlockId, purchase.block.id);

			const buyerTransactions = await walletService.getTransactions(buyer.id);
			const sellerTransactions = await walletService.getTransactions(seller.id);
			assert.ok(buyerTransactions.some((entry) => entry.type === 'purchase' && entry.amount === 50));
			assert.ok(sellerTransactions.some((entry) => entry.type === 'sale' && entry.amount === 50));
			assert.equal(buyerTransactions[0].referenceId, `listing:${listing.id}`);

			const chain = await blockchainService.verifyChain();
			assert.equal(chain.valid, true);
		});

		it('AC-5: rejects a purchase the buyer cannot afford and changes nothing', async () => {
			const { seller, buyer, asset, listing } = await setUpSale({ buyerBalance: 20 });

			await assert.rejects(
				marketplaceService.purchaseListing(buyer.id, listing.id),
				(error) => error.status === 402
			);

			assert.equal(await balanceOf(buyer.id), 20);
			assert.equal(await balanceOf(seller.id), 0);

			const untouched = await marketplaceService.getListingById(listing.id);
			assert.equal(untouched.status, 'active');
			assert.equal(untouched.buyerId, null);

			const ownedAsset = await assetRepository.getAssetById(asset.id);
			assert.equal(ownedAsset.ownerId, seller.id);
		});

		it('refuses to let a seller buy their own listing', async () => {
			const { seller, listing } = await setUpSale();

			await assert.rejects(
				marketplaceService.purchaseListing(seller.id, listing.id),
				(error) => error.status === 400
			);
		});

		it('AC-7: only one of two simultaneous buyers succeeds', async () => {
			const seller = await createUser('Seller');
			const firstBuyer = await createUser('First buyer', 100);
			const secondBuyer = await createUser('Second buyer', 100);
			const asset = await createAsset(seller.id, 'Sunrise');
			const listing = await marketplaceService.createListing(seller.id, {
				assetId: asset.id,
				listingType: 'sale',
				price: 50,
			});

			const results = await Promise.allSettled([
				marketplaceService.purchaseListing(firstBuyer.id, listing.id),
				marketplaceService.purchaseListing(secondBuyer.id, listing.id),
			]);

			const fulfilled = results.filter((result) => result.status === 'fulfilled');
			const rejected = results.filter((result) => result.status === 'rejected');

			assert.equal(fulfilled.length, 1, 'exactly one purchase should succeed');
			assert.equal(rejected.length, 1);
			assert.equal(rejected[0].reason.status, 409);

			// The losing buyer must not have been charged.
			const balances = [await balanceOf(firstBuyer.id), await balanceOf(secondBuyer.id)];
			assert.deepEqual(
				balances.sort((first, second) => first - second),
				[50, 100]
			);
			assert.equal(await balanceOf(seller.id), 50);
		});

		it('refuses to buy a listing that is already sold or removed', async () => {
			const { buyer, listing } = await setUpSale();
			const otherBuyer = await createUser('Late buyer', 100);

			await marketplaceService.purchaseListing(buyer.id, listing.id);

			await assert.rejects(
				marketplaceService.purchaseListing(otherBuyer.id, listing.id),
				(error) => error.status === 409
			);
		});

		it('AC-11: rolls the whole purchase back when a later step fails', async () => {
			const { seller, buyer, asset, listing } = await setUpSale();

			// Force the ownership update to fail mid-settlement, after both
			// wallets have already been written inside the transaction.
			const originalUpdate = require('../server/src/repositories/ownershipRepository').updateAssetOwner;
			require('../server/src/repositories/ownershipRepository').updateAssetOwner = async () => {
				throw new Error('simulated ledger failure');
			};

			try {
				await assert.rejects(marketplaceService.purchaseListing(buyer.id, listing.id));
			} finally {
				require('../server/src/repositories/ownershipRepository').updateAssetOwner = originalUpdate;
			}

			assert.equal(await balanceOf(buyer.id), 100);
			assert.equal(await balanceOf(seller.id), 0);

			const untouched = await marketplaceService.getListingById(listing.id);
			assert.equal(untouched.status, 'active');

			const ownedAsset = await assetRepository.getAssetById(asset.id);
			assert.equal(ownedAsset.ownerId, seller.id);

			const transactions = await walletService.getTransactions(buyer.id);
			assert.equal(transactions.filter((entry) => entry.type === 'purchase').length, 0);
		});
	});

	describe('managing a listing', () => {
		it('lets the seller change the price', async () => {
			const seller = await createUser('Seller');
			const asset = await createAsset(seller.id, 'Sunrise');
			const listing = await marketplaceService.createListing(seller.id, {
				assetId: asset.id,
				listingType: 'sale',
				price: 50,
			});

			const updated = await marketplaceService.updateListing(seller.id, listing.id, { price: 75 });

			assert.equal(updated.price, 75);
		});

		it('AC-9: refuses a seller marking their own listing sold', async () => {
			const seller = await createUser('Seller');
			const asset = await createAsset(seller.id, 'Sunrise');
			const listing = await marketplaceService.createListing(seller.id, {
				assetId: asset.id,
				listingType: 'sale',
				price: 50,
			});

			await assert.rejects(
				marketplaceService.updateListing(seller.id, listing.id, { status: 'sold' }),
				(error) => error.status === 409
			);

			const untouched = await marketplaceService.getListingById(listing.id);
			assert.equal(untouched.status, 'active');
		});

		it('AC-8: refuses edits to a listing that has already sold', async () => {
			const seller = await createUser('Seller');
			const buyer = await createUser('Buyer', 100);
			const asset = await createAsset(seller.id, 'Sunrise');
			const listing = await marketplaceService.createListing(seller.id, {
				assetId: asset.id,
				listingType: 'sale',
				price: 50,
			});

			await marketplaceService.purchaseListing(buyer.id, listing.id);

			await assert.rejects(
				marketplaceService.updateListing(seller.id, listing.id, { price: 10 }),
				(error) => error.status === 409
			);
			await assert.rejects(
				marketplaceService.deleteListing(seller.id, listing.id),
				(error) => error.status === 409
			);
		});

		it('refuses edits and removal by anyone but the seller', async () => {
			const seller = await createUser('Seller');
			const stranger = await createUser('Stranger');
			const asset = await createAsset(seller.id, 'Sunrise');
			const listing = await marketplaceService.createListing(seller.id, {
				assetId: asset.id,
				listingType: 'sale',
				price: 50,
			});

			await assert.rejects(
				marketplaceService.updateListing(stranger.id, listing.id, { price: 1 }),
				(error) => error.status === 403
			);
			await assert.rejects(
				marketplaceService.deleteListing(stranger.id, listing.id),
				(error) => error.status === 403
			);
		});

		it('keeps a removed listing out of browse but readable by id, and frees the asset', async () => {
			const seller = await createUser('Seller');
			const asset = await createAsset(seller.id, 'Sunrise');
			const listing = await marketplaceService.createListing(seller.id, {
				assetId: asset.id,
				listingType: 'sale',
				price: 50,
			});

			await marketplaceService.deleteListing(seller.id, listing.id);

			const { pagination } = await marketplaceService.getListings();
			assert.equal(pagination.total, 0);

			const removed = await marketplaceService.getListingById(listing.id);
			assert.equal(removed.status, 'removed');

			// Removing a listing must let the seller list the asset again.
			const relisted = await marketplaceService.createListing(seller.id, {
				assetId: asset.id,
				listingType: 'sale',
				price: 60,
			});
			assert.equal(relisted.status, 'active');
		});
	});

	describe('browsing', () => {
		async function seedListings() {
			const seller = await createUser('Seller');
			const prices = [10, 250, 90];
			const titles = ['Blue Painting', 'Red Sculpture', 'Blue Photograph'];

			for (let index = 0; index < prices.length; index += 1) {
				const asset = await createAsset(seller.id, titles[index]);
				await marketplaceService.createListing(seller.id, {
					assetId: asset.id,
					listingType: 'sale',
					price: prices[index],
				});
			}

			return seller;
		}

		it('searches by asset title', async () => {
			await seedListings();

			const { listings } = await marketplaceService.getListings({ search: 'blue' });

			assert.equal(listings.length, 2);
		});

		it('filters by price range', async () => {
			await seedListings();

			const { listings } = await marketplaceService.getListings({ minPrice: 50, maxPrice: 100 });

			assert.equal(listings.length, 1);
			assert.equal(listings[0].price, 90);
		});

		it('sorts by price', async () => {
			await seedListings();

			const ascending = await marketplaceService.getListings({ sort: 'price_asc' });
			const descending = await marketplaceService.getListings({ sort: 'price_desc' });

			assert.deepEqual(
				ascending.listings.map((listing) => listing.price),
				[10, 90, 250]
			);
			assert.deepEqual(
				descending.listings.map((listing) => listing.price),
				[250, 90, 10]
			);
		});

		it('pages results', async () => {
			await seedListings();

			const firstPage = await marketplaceService.getListings({ limit: 2, page: 1 });
			const secondPage = await marketplaceService.getListings({ limit: 2, page: 2 });

			assert.equal(firstPage.listings.length, 2);
			assert.equal(secondPage.listings.length, 1);
			assert.equal(firstPage.pagination.total, 3);
			assert.equal(firstPage.pagination.totalPages, 2);
		});

		it('rejects nonsense paging and sorting', async () => {
			await assert.rejects(marketplaceService.getListings({ limit: 0 }), (error) => error.status === 400);
			await assert.rejects(marketplaceService.getListings({ limit: 5000 }), (error) => error.status === 400);
			await assert.rejects(marketplaceService.getListings({ page: -1 }), (error) => error.status === 400);
			await assert.rejects(
				marketplaceService.getListings({ sort: 'cheapest' }),
				(error) => error.status === 400
			);
			await assert.rejects(
				marketplaceService.getListings({ minPrice: 100, maxPrice: 10 }),
				(error) => error.status === 400
			);
		});
	});

	describe('seller and buyer views', () => {
		it('reports which owned assets can be listed and why not', async () => {
			const seller = await createUser('Seller');
			const listedAsset = await createAsset(seller.id, 'Already listed');
			const freeAsset = await createAsset(seller.id, 'Available');
			const flaggedAsset = await createAsset(seller.id, 'Flagged');

			await marketplaceService.createListing(seller.id, {
				assetId: listedAsset.id,
				listingType: 'sale',
				price: 50,
			});
			await run(`INSERT INTO verification_reports (asset_id, verification_type, status) VALUES (?, ?, ?)`, [
				flaggedAsset.id,
				'image',
				'modified_copy',
			]);

			const assets = await marketplaceService.getListableAssets(seller.id);
			const byId = new Map(assets.map((asset) => [asset.id, asset]));

			assert.equal(byId.get(freeAsset.id).listable, true);
			assert.equal(byId.get(listedAsset.id).listable, false);
			assert.match(byId.get(listedAsset.id).reason, /already listed/i);
			assert.equal(byId.get(flaggedAsset.id).listable, false);
		});

		it('shows each side of a completed trade', async () => {
			const seller = await createUser('Seller');
			const buyer = await createUser('Buyer', 100);
			const asset = await createAsset(seller.id, 'Sunrise');
			const listing = await marketplaceService.createListing(seller.id, {
				assetId: asset.id,
				listingType: 'sale',
				price: 50,
			});

			await marketplaceService.purchaseListing(buyer.id, listing.id);

			const buyerTrades = await marketplaceService.getTrades(buyer.id);
			const sellerTrades = await marketplaceService.getTrades(seller.id);

			assert.equal(buyerTrades.length, 1);
			assert.equal(buyerTrades[0].role, 'buyer');
			assert.equal(sellerTrades.length, 1);
			assert.equal(sellerTrades[0].role, 'seller');
		});

		it('lists the seller their own listings in every status', async () => {
			const seller = await createUser('Seller');
			const activeAsset = await createAsset(seller.id, 'Active');
			const removedAsset = await createAsset(seller.id, 'Removed');

			await marketplaceService.createListing(seller.id, {
				assetId: activeAsset.id,
				listingType: 'sale',
				price: 50,
			});
			const toRemove = await marketplaceService.createListing(seller.id, {
				assetId: removedAsset.id,
				listingType: 'sale',
				price: 60,
			});
			await marketplaceService.deleteListing(seller.id, toRemove.id);

			const mine = await marketplaceService.getMyListings(seller.id);

			assert.equal(mine.length, 2);
			assert.deepEqual(new Set(mine.map((listing) => listing.status)), new Set(['active', 'removed']));
		});
	});

	describe('wallet protection', () => {
		it('refuses user-submitted purchase and sale entries', async () => {
			const user = await createUser('User', 100);

			for (const type of ['purchase', 'sale']) {
				await assert.rejects(
					walletService.addTransaction(user.id, { type, amount: 500 }),
					(error) => error.status === 403
				);
			}

			assert.equal(await balanceOf(user.id), 100);
		});

		it('refuses a withdrawal larger than the balance', async () => {
			const user = await createUser('User', 100);

			await assert.rejects(
				walletService.addTransaction(user.id, { type: 'withdrawal', amount: 500 }),
				(error) => error.status === 400
			);

			assert.equal(await balanceOf(user.id), 100);
		});
	});

	describe('ledger', () => {
		it('detects a tampered block', async () => {
			const seller = await createUser('Seller');
			const buyer = await createUser('Buyer', 100);
			const asset = await createAsset(seller.id, 'Sunrise');
			const listing = await marketplaceService.createListing(seller.id, {
				assetId: asset.id,
				listingType: 'sale',
				price: 50,
			});

			await marketplaceService.purchaseListing(buyer.id, listing.id);
			assert.equal((await blockchainService.verifyChain()).valid, true);

			// Rewrite history: claim the asset went to the seller instead.
			const block = await get('SELECT id FROM blockchain_blocks ORDER BY block_index DESC LIMIT 1');
			await run('UPDATE blockchain_blocks SET owner_id = ? WHERE id = ?', [seller.id, block.id]);

			const result = await blockchainService.verifyChain();
			assert.equal(result.valid, false);
			assert.match(result.reason, /do not match/i);
		});
	});
});
